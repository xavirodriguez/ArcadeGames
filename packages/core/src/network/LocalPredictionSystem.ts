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
        private networkManager: NetworkManager,
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
        for (const entity of localQuery) {
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
            this.inputQueue = this.inputQueue.filter(i => i.tick > serverTick);

            const localQuery = world.query(...(this.reconcileQueryComponents as any));
            for (const entity of localQuery) {
                world.mutateComponent(entity, "Transform" as Extract<keyof TRegistry, string>, (t: any) => {
                    t.x = serverState.x;
                    t.y = serverState.y;
                });
                world.mutateComponent(entity, "Velocity" as Extract<keyof TRegistry, string>, (v: any) => {
                    v.vx = serverState.vx;
                    v.vy = serverState.vy;
                });

                for (const item of this.inputQueue) {
                    const itemDtSec = item.dt;

                    if (this.simulateFn) {
                        this.simulateFn(world, item.input, itemDtSec);
                    }

                    if (this.reconcileFn) {
                        this.reconcileFn(world, entity, item.input, itemDtSec);
                    } else {
                        const currentVelocity  = world.getComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as any;

                        world.mutateComponent(entity, "Transform" as Extract<keyof TRegistry, string>, (t: any) => {
                            t.x += currentVelocity.vx * itemDtSec;
                            t.y += currentVelocity.vy * itemDtSec;
                        });
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
