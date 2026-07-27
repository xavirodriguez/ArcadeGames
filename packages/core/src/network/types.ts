import { CoreComponentRegistry } from "../ecs/CoreComponents";

/** @public */
export interface MultiplayerRegistry extends CoreComponentRegistry {
    RemotePlayer: { type: "RemotePlayer"; sessionId?: string; targetX?: number; targetY?: number; targetRotation?: number };
    LocalPlayer: { type: "LocalPlayer" };
    Input: {
        type: "Input";
        actions: Set<string>;
        axes: Record<string, number>;
    };
}

/** @public */
export interface ReconciledInput<TInput = {
    actions: Set<string>;
    axes: Record<string, number>;
}> {
    tick: number;
    input: TInput;
    state: { x: number; y: number; vx: number; vy: number };
    dt: number;
}

/** @public */
export interface AuthoritativeServerState {
    x: number;
    y: number;
    vx: number;
    vy: number;
}
