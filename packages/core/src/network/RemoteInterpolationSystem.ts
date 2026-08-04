import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { NetworkManager } from "./NetworkManager";
import { MultiplayerRegistry } from "./types";

/**
 * System responsible for visual interpolation (LERP) on Remote Players.
 * Runs in SystemPhase.Presentation phase.
 *
 * @public
 */
export class RemoteInterpolationSystem<TRegistry extends MultiplayerRegistry = MultiplayerRegistry> extends System<TRegistry> {
    constructor(
        private networkManager: NetworkManager,
        private smoothingFactor: number = 0.15,
        private queryComponents: string[] = ["Transform", "RemotePlayer"]
    ) {
        super();
    }

    public update(world: World<TRegistry>, _deltaTime: number): void {
        const w = world as unknown as World<MultiplayerRegistry>;

        const remoteQuery = w.query(...(this.queryComponents as any));
        for (const entity of remoteQuery) {
            const remote = w.getComponent(entity, "RemotePlayer" as any) as any;
            if (remote && remote.targetX !== undefined && remote.targetY !== undefined) {
                const alpha = 1 - Math.pow(1 - this.smoothingFactor, _deltaTime * 60);
                w.mutateComponent(entity, "Transform" as any, (t: any) => {
                    t.x += (remote.targetX! - t.x) * alpha;
                    t.y += (remote.targetY! - t.y) * alpha;
                    if (remote.targetRotation !== undefined) {
                        let diffRot = remote.targetRotation - t.rotation;
                        while (diffRot > Math.PI) diffRot -= Math.PI * 2;
                        while (diffRot < -Math.PI) diffRot += Math.PI * 2;
                        t.rotation += diffRot * alpha;
                    }
                });
            }
        }
    }

    public override onRegister(_world: World<TRegistry>): void {}
    public override dispose(): void {}
}
