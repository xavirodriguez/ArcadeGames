import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { World } from "../ecs/World";

/**
 * Registry interface for multiplayer components.
 *
 * @public
 */
export interface MultiplayerRegistry extends CoreComponentRegistry {
    RemotePlayer: { type: "RemotePlayer"; sessionId?: string; targetX?: number; targetY?: number; targetRotation?: number };
    LocalPlayer: { type: "LocalPlayer" };
    Input: {
        type: "Input";
        actions: Set<string>;
        axes: Record<string, number>;
    };
}

/**
 * Represents a historical input tick queued for prediction reconciliation.
 *
 * @public
 */
export interface ReconciledInput<TInput = {
    actions: Set<string>;
    axes: Record<string, number>;
}> {
    /** The simulation tick index. */
    tick: number;
    /** The input payload captured at this tick. */
    input: TInput;
    /** The predicted state captured at this tick. */
    state: { x: number; y: number; vx: number; vy: number };
    /** The delta time for this tick. */
    dt: number;
}

/**
 * Authoritative server state snapshot for an entity.
 *
 * @public
 */
export interface AuthoritativeServerState {
    /** The authoritative x coordinate. */
    x: number;
    /** The authoritative y coordinate. */
    y: number;
    /** The authoritative velocity along x axis. */
    vx: number;
    /** The authoritative velocity along y axis. */
    vy: number;
}

/**
 * Strategy interface for client-side local prediction and input reconciliation.
 *
 * @public
 */
export interface IPredictionModel<
    TRegistry extends MultiplayerRegistry = MultiplayerRegistry,
    TInput = any
> {
    /**
     * Optional array of component names required for querying local prediction entities.
     */
    queryComponents?: Extract<keyof TRegistry, string>[];

    /**
     * Simulates prediction for a single entity and input frame.
     *
     * @param world - The ECS world.
     * @param entity - The ID of the entity being predicted.
     * @param input - The input payload for this simulation step.
     * @param dt - Delta time in seconds.
     */
    simulate(world: World<TRegistry>, entity: number, input: TInput, dt: number): void;

    /**
     * Applies authoritative server state to an entity before re-simulating queued inputs.
     *
     * @param world - The ECS world.
     * @param entity - The ID of the entity being reconciled.
     * @param state - The authoritative server state snapshot.
     */
    applyAuthoritativeState(
        world: World<TRegistry>,
        entity: number,
        state: AuthoritativeServerState
    ): void;
}

/**
 * Strategy interface for remote entity visual interpolation.
 *
 * @public
 */
export interface IInterpolationModel<
    TRegistry extends MultiplayerRegistry = MultiplayerRegistry
> {
    /**
     * Optional array of component names required for querying remote interpolation entities.
     */
    queryComponents?: Extract<keyof TRegistry, string>[];

    /**
     * Interpolates entity visual components toward the target remote state.
     *
     * @param world - The ECS world.
     * @param entity - The ID of the entity being interpolated.
     * @param targetState - Target position and rotation state received from remote player.
     * @param deltaTime - Delta time in seconds.
     */
    interpolate(
        world: World<TRegistry>,
        entity: number,
        targetState: { targetX?: number; targetY?: number; targetRotation?: number },
        deltaTime: number
    ): void;
}

/**
 * Configuration options for LocalPredictionSystem.
 *
 * @public
 */
export interface LocalPredictionOptions<
    TRegistry extends MultiplayerRegistry = MultiplayerRegistry,
    TInput = any
> {
    /** The prediction model strategy instance. */
    predictionModel?: IPredictionModel<TRegistry, TInput>;
    /**
     * Legacy simulation callback function.
     *
     * @deprecated Use `predictionModel` instead.
     */
    simulateFn?: (world: World<TRegistry>, input: TInput, dt: number) => void;
    /** Component names queried during prediction update phase. */
    queryComponents?: Extract<keyof TRegistry, string>[];
    /** Component names queried during reconciliation phase. */
    reconcileQueryComponents?: Extract<keyof TRegistry, string>[];
    /**
     * Legacy reconciliation callback function.
     *
     * @deprecated Use `predictionModel` instead.
     */
    reconcileFn?: (world: World<TRegistry>, entity: number, input: TInput, dt: number) => void;
}

/**
 * Configuration options for RemoteInterpolationSystem.
 *
 * @public
 */
export interface RemoteInterpolationOptions<
    TRegistry extends MultiplayerRegistry = MultiplayerRegistry
> {
    /** The interpolation model strategy instance. */
    interpolationModel?: IInterpolationModel<TRegistry>;
    /** Smoothing factor used when default exponential smoothing is active (default 0.15). */
    smoothingFactor?: number;
    /** Component names queried during interpolation update phase. */
    queryComponents?: Extract<keyof TRegistry, string>[];
}

/**
 * Default linear prediction strategy using entity velocity.
 *
 * @public
 */
export class LinearPredictionModel<
    TRegistry extends MultiplayerRegistry = MultiplayerRegistry,
    TInput = any
> implements IPredictionModel<TRegistry, TInput> {
    /** Component names queried for linear prediction. */
    public queryComponents?: Extract<keyof TRegistry, string>[] = [
        "Transform",
        "LocalPlayer",
        "Velocity",
        "Input"
    ] as any;

    /**
     * Creates an instance of LinearPredictionModel.
     */
    constructor() {}

    /**
     * Integrates velocity into entity position over dt seconds.
     */
    public simulate(
        world: World<TRegistry>,
        entity: number,
        _input: TInput,
        dt: number
    ): void {
        const vel = world.getComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as any;
        const mutT = world.getMutableComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as any;
        if (mutT && vel) {
            mutT.x += vel.vx * dt;
            mutT.y += vel.vy * dt;
        }
    }

    /**
     * Sets entity Transform and Velocity to authoritative server values.
     */
    public applyAuthoritativeState(
        world: World<TRegistry>,
        entity: number,
        state: AuthoritativeServerState
    ): void {
        const mutTrans = world.getMutableComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as any;
        if (mutTrans) {
            mutTrans.x = state.x;
            mutTrans.y = state.y;
        }

        const mutVel = world.getMutableComponent(entity, "Velocity" as Extract<keyof TRegistry, string>) as any;
        if (mutVel) {
            mutVel.vx = state.vx;
            mutVel.vy = state.vy;
        }
    }
}

/**
 * Default exponential smoothing strategy for remote player visual interpolation.
 *
 * @public
 */
export class ExponentialSmoothingModel<
    TRegistry extends MultiplayerRegistry = MultiplayerRegistry
> implements IInterpolationModel<TRegistry> {
    /** Component names queried for exponential smoothing. */
    public queryComponents?: Extract<keyof TRegistry, string>[] = [
        "Transform",
        "RemotePlayer"
    ] as any;

    /**
     * Creates an instance of ExponentialSmoothingModel.
     *
     * @param smoothingFactor - Factor controlling smoothing speed (default 0.15).
     */
    constructor(private smoothingFactor: number = 0.15) {}

    /**
     * Smoothly interpolates transform position and rotation toward target remote state.
     */
    public interpolate(
        world: World<TRegistry>,
        entity: number,
        targetState: { targetX?: number; targetY?: number; targetRotation?: number },
        deltaTime: number
    ): void {
        if (targetState.targetX === undefined && targetState.targetY === undefined) {
            return;
        }

        const alpha = 1 - Math.pow(1 - this.smoothingFactor, deltaTime * 60);

        world.mutateComponent(entity, "Transform" as Extract<keyof TRegistry, string>, (t: any) => {
            if (targetState.targetX !== undefined) {
                t.x += (targetState.targetX - t.x) * alpha;
            }
            if (targetState.targetY !== undefined) {
                t.y += (targetState.targetY - t.y) * alpha;
            }
            if (targetState.targetRotation !== undefined && t.rotation !== undefined) {
                let diffRot = targetState.targetRotation - t.rotation;
                while (diffRot > Math.PI) diffRot -= Math.PI * 2;
                while (diffRot < -Math.PI) diffRot += Math.PI * 2;
                t.rotation += diffRot * alpha;
            }
        });
    }
}
