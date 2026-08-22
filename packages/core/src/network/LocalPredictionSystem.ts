import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { NetworkManager } from "./NetworkManager";
import { MultiplayerRegistry, ReconciledInput, AuthoritativeServerState } from "./types";

/**
 * System responsible for client-side local prediction and input reconciliation.
 * Runs in SystemPhase.Input phase.
 *
 * @public
 */
export class LocalPredictionSystem<TRegistry extends MultiplayerRegistry = MultiplayerRegistry> extends System<TRegistry> {
    private inputQueue: ReconciledInput<unknown>[] = [];
    private lastProcessedTick = 0;

    constructor(
        private networkManager: NetworkManager<TRegistry>,
        private simulateFn?: (world: World<TRegistry>, input: any, dt: number) => void,
        private queryComponents: Extract<keyof TRegistry, string>[] = ["Transform", "LocalPlayer", "Velocity", "Input"] as any,
        private reconcileQueryComponents: Extract<keyof TRegistry, string>[] = ["Transform", "LocalPlayer", "Velocity"] as any,
        private reconcileFn?: (world: World<TRegistry>, entity: number, input: any, dt: number) => void
    ) {
        super();
    }

    public update(world: World<TRegistry>, deltaTime: number): void {
        const dtSec = deltaTime;

        const localQuery = world.query(...(this.queryComponents as any));
        const qLen = localQuery.length;
        // Safe for determinism/rollback. Sequential indexed loop replaces for..of iterator.
        for (let i = 0; i < qLen; i++) {
            const entity = localQuery[i];
            const input     = world.getComponent(entity, "Input" as Extract<keyof TRegistry, string>) as any;
            const velocity  = world.getComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as any;
            const transform = world.getComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as any;
            if (!input || !velocity || !transform) continue;

            if (this.simulateFn) {
                this.simulateFn(world, input, dtSec);
            }

            const finalVelocity  = world.getComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as any;
            const finalTransform = world.getComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as any;

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
            // Safe for determinism/rollback. In-place filter/trim avoids allocating new array per reconciliation step.
            let writeIdx = 0;
            const qLen = this.inputQueue.length;
            for (let i = 0; i < qLen; i++) {
                if (this.inputQueue[i].tick > serverTick) {
                    this.inputQueue[writeIdx++] = this.inputQueue[i];
                }
            }
            this.inputQueue.length = writeIdx;

            const localQuery = world.query(...(this.reconcileQueryComponents as any));
            const entLen = localQuery.length;
            for (let i = 0; i < entLen; i++) {
                const entity = localQuery[i];
                // Safe for determinism/rollback. Replacing mutateComponent with direct getMutableComponent eliminates callback closure allocations per reconciliation frame.
                const mutTrans = world.getMutableComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as any;
                if (mutTrans) {
                    mutTrans.x = serverState.x;
                    mutTrans.y = serverState.y;
                }

                const mutVel = world.getMutableComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as any;
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
                        const currentVelocity = world.getComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as any;
                        const mutT = world.getMutableComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as any;
                        if (mutT && currentVelocity) {
                            mutT.x += currentVelocity.vx * itemDtSec;
                            mutT.y += currentVelocity.vy * itemDtSec;
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
