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
        private simulateFn?: (world: World<TRegistry>, input: unknown, dt: number) => void
    ) {
        super();
    }

    public update(world: World<TRegistry>, deltaTime: number): void {
        const w = world as unknown as World<MultiplayerRegistry>;
        const dtSec = deltaTime;

        const localQuery = w.query("Transform", "LocalPlayer", "Velocity", "Input");
        for (const entity of localQuery) {
            const input     = w.getComponent(entity, "Input");
            const velocity  = w.getComponent(entity, "Velocity");
            const transform = w.getComponent(entity, "Transform");
            if (!input || !velocity || !transform) continue;

            if (this.simulateFn) {
                this.simulateFn(world, input, dtSec);
            }

            const finalVelocity  = w.getComponent(entity, "Velocity")!;
            const finalTransform = w.getComponent(entity, "Transform")!;

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
        const w = world as unknown as World<MultiplayerRegistry>;
        const random = w.gameplayRandom;
        const wasLocked = random ? random.isLocked() : false;

        if (random) {
            random.unlock();
        }

        try {
            this.inputQueue = this.inputQueue.filter(i => i.tick > serverTick);

            const localQuery = w.query("Transform", "LocalPlayer", "Velocity");
            for (const entity of localQuery) {
                w.mutateComponent(entity, "Transform", (t) => {
                    t.x = serverState.x;
                    t.y = serverState.y;
                });
                w.mutateComponent(entity, "Velocity", (v) => {
                    v.vx = serverState.vx;
                    v.vy = serverState.vy;
                });

                for (const item of this.inputQueue) {
                    const itemDtSec = item.dt;

                    if (this.simulateFn) {
                        this.simulateFn(world, item.input, itemDtSec);
                    }

                    const currentTransform = w.getComponent(entity, "Transform")!;
                    const currentVelocity  = w.getComponent(entity, "Velocity")!;

                    w.mutateComponent(entity, "Transform", (t) => {
                        t.x += currentVelocity.vx * itemDtSec;
                        t.y += currentVelocity.vy * itemDtSec;
                    });
                }
            }
        } finally {
            if (random && wasLocked) {
                random.lock();
            }
        }
    }
}
