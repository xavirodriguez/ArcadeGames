import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { NetworkManager } from "./NetworkManager";
import {
    MultiplayerRegistry,
    ReconciledInput,
    AuthoritativeServerState,
    IPredictionModel,
    LocalPredictionOptions,
    LinearPredictionModel
} from "./types";

// Tipos auxiliares de componentes esperados por el sistema de físicas/predicción
/**
 * Helper transform interface for network prediction.
 * @public
 */
export interface TransformLike { x: number; y: number; [key: string]: unknown; }

/**
 * Helper velocity interface for network prediction.
 * @public
 */
export interface VelocityLike { vx: number; vy: number; [key: string]: unknown; }
/**
 * System responsible for client-side local prediction and input reconciliation.
 * Runs in SystemPhase.Input phase.
 *
 * @public
 */
export class LocalPredictionSystem<
    TRegistry extends MultiplayerRegistry = MultiplayerRegistry,
    TInput = Record<string, unknown>
> extends System<TRegistry> {
    private inputQueue: ReconciledInput<TInput>[] = [];
    private lastProcessedTick = 0;

    private predictionModel?: IPredictionModel<TRegistry, TInput>;
    /** @deprecated Use predictionModel instead. */
    private simulateFn?: (world: World<TRegistry>, input: TInput, dt: number) => void;
    /** @deprecated Use predictionModel instead. */
    private reconcileFn?: (world: World<TRegistry>, entity: number, input: TInput, dt: number) => void;

    private queryComponents: Extract<keyof TRegistry, string>[];
    private reconcileQueryComponents: Extract<keyof TRegistry, string>[];

    /**
     * Constructs a LocalPredictionSystem with options object or legacy positional parameters.
     *
     * @param networkManager - The network manager instance.
     * @param optionsOrSimulateFn - Configuration options object or legacy simulate function.
     * @param queryComponents - Legacy positional query components array.
     * @param reconcileQueryComponents - Legacy positional reconcile query components array.
     * @param reconcileFn - Legacy positional reconcile function.
     */
    constructor(
        private networkManager: NetworkManager<TRegistry>,
        optionsOrSimulateFn?: LocalPredictionOptions<TRegistry, TInput> | ((world: World<TRegistry>, input: TInput, dt: number) => void),
        queryComponents?: Extract<keyof TRegistry, string>[],
        reconcileQueryComponents?: Extract<keyof TRegistry, string>[],
        reconcileFn?: (world: World<TRegistry>, entity: number, input: TInput, dt: number) => void
    ) {
        super();
        if (typeof optionsOrSimulateFn === "object" && optionsOrSimulateFn !== null) {
            const options = optionsOrSimulateFn;
            this.predictionModel = options.predictionModel;
            this.simulateFn = options.simulateFn;
            this.reconcileFn = options.reconcileFn;
            this.queryComponents = options.queryComponents 
                ?? (options.predictionModel?.queryComponents as Extract<keyof TRegistry, string>[]) 
                ?? (["Transform", "LocalPlayer", "Velocity", "Input"] as Extract<keyof TRegistry, string>[]);
            this.reconcileQueryComponents = options.reconcileQueryComponents 
                ?? (["Transform", "LocalPlayer", "Velocity"] as Extract<keyof TRegistry, string>[]);
        } else {
            this.simulateFn = optionsOrSimulateFn;
            this.queryComponents = queryComponents 
                ?? (["Transform", "LocalPlayer", "Velocity", "Input"] as Extract<keyof TRegistry, string>[]);
            this.reconcileQueryComponents = reconcileQueryComponents 
                ?? (["Transform", "LocalPlayer", "Velocity"] as Extract<keyof TRegistry, string>[]);
            this.reconcileFn = reconcileFn;
        }

        if (!this.predictionModel && !this.simulateFn && !this.reconcileFn) {
            this.predictionModel = new LinearPredictionModel<TRegistry, TInput>();
        }
    }

    public update(world: World<TRegistry>, deltaTime: number): void {
        if (world.getResource("IsPaused") === true) return;
        const dtSec = deltaTime;

        const localQuery = world.query(...this.queryComponents);
        const qLen = localQuery.length;

        for (let i = 0; i < qLen; i++) {
            const entity = localQuery[i];
            const input = world.getComponent(entity, "Input" as Extract<keyof TRegistry, string>) as TInput | undefined;
            const velocity = world.getComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as VelocityLike | undefined;
            const transform = world.getComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as TransformLike | undefined;
            
            if (!input || !velocity || !transform) continue;

            if (this.predictionModel) {
                this.predictionModel.simulate(world, entity, input, dtSec);
            } else if (this.simulateFn) {
                this.simulateFn(world, input, dtSec);
            }

            const finalVelocity = world.getComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as VelocityLike | undefined;
            const finalTransform = world.getComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as TransformLike | undefined;

            if (!finalVelocity || !finalTransform) continue;

            this.inputQueue.push({
                tick: this.lastProcessedTick++,
                input: { ...input },
                state: {
                    x: finalTransform.x, y: finalTransform.y,
                    vx: finalVelocity.vx, vy: finalVelocity.vy
                },
                dt: deltaTime
            });
        }
    }

    public override onRegister(_world: World<TRegistry>): void {}
    public override dispose(): void {}

    public reconcile(
        world: World<TRegistry>,
        serverTick: number,
        serverState: AuthoritativeServerState
    ): void {
        const random = world.gameplayRandom;
        const wasLocked = random ? random.isLocked() : false;

        if (random) {
            random.unlock();
        }

        try {
            let writeIdx = 0;
            const qLen = this.inputQueue.length;
            for (let i = 0; i < qLen; i++) {
                if (this.inputQueue[i].tick > serverTick) {
                    this.inputQueue[writeIdx++] = this.inputQueue[i];
                }
            }
            this.inputQueue.length = writeIdx;

            const localQuery = world.query(...this.reconcileQueryComponents);
            const entLen = localQuery.length;
            for (let i = 0; i < entLen; i++) {
                const entity = localQuery[i];

                if (this.predictionModel) {
                    this.predictionModel.applyAuthoritativeState(world, entity, serverState);
                    const itemLen = this.inputQueue.length;
                    for (let k = 0; k < itemLen; k++) {
                        const item = this.inputQueue[k];
                        this.predictionModel.simulate(world, entity, item.input, item.dt);
                    }
                } else {
                    const mutTrans = world.getMutableComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as TransformLike | undefined;
                    if (mutTrans) {
                        mutTrans.x = serverState.x;
                        mutTrans.y = serverState.y;
                    }

                    const mutVel = world.getMutableComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as VelocityLike | undefined;
                    if (mutVel) {
                        mutVel.vx = serverState.vx;
                        mutVel.vy = serverState.vy;
                    }

                    const itemLen = this.inputQueue.length;
                    for (let k = 0; k < itemLen; k++) {
                        const item = this.inputQueue[k];
                        const itemDtSec = item.dt;

                        if (this.simulateFn) {
                            this.simulateFn(world, item.input, itemDtSec);
                        }

                        if (this.reconcileFn) {
                            this.reconcileFn(world, entity, item.input, itemDtSec);
                        } else {
                            const currentVelocity = world.getComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as VelocityLike | undefined;
                            const mutT = world.getMutableComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as TransformLike | undefined;
                            if (mutT && currentVelocity) {
                                mutT.x += currentVelocity.vx * itemDtSec;
                                mutT.y += currentVelocity.vy * itemDtSec;
                            }
                        }
                    }
                }
            }
        } finally {
            if (random && wasLocked) {
                random.lock();
            }
        }
    }
}