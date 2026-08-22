export interface GenericInputFrame {
  protocolVersion: number;
  tick: number;
  timestamp: number;
  actions: string[];
  axes: Record<string, number>;
}

/**
 * Standard action names allowed in CanonicalInputState.
 * @public
 */
export type CanonicalActionName<TExtra extends string = "never"> =
  | "fire"
  | "secondary"
  | "boost"
  | "hyperspace"
  | "pause"
  | "confirm"
  | "cancel"
  | TExtra;

/**
 * Hardware-agnostic player input state contract.
 * @public
 */
export interface CanonicalInputState<TExtra extends string = "never"> {
  axes: {
    moveX: number;
    moveY: number;
    aimX: number;
    aimY: number;
  };
  actions: Set<CanonicalActionName<TExtra>>;
  timestamp: number;
}

/**
 * Pure function translating a CanonicalInputState to a network-serializable input frame.
 *
 * @param state - The canonical input state to convert.
 * @param protocolVersion - Protocol version (defaults to 1).
 * @param tick - Simulation tick (defaults to 0).
 * @public
 */
export function canonicalToInputFrame<TExtra extends string = "never">(
  state: CanonicalInputState<TExtra>,
  protocolVersion = 1,
  tick = 0
): GenericInputFrame {
  return {
    protocolVersion,
    tick,
    timestamp: state.timestamp,
    actions: Array.from(state.actions),
    axes: {
      moveX: state.axes.moveX,
      moveY: state.axes.moveY,
      aimX: state.axes.aimX,
      aimY: state.axes.aimY,
    },
  };
}

/**
 * Pure function translating a network input frame into a CanonicalInputState.
 *
 * @param frame - The network input frame to parse.
 * @public
 */
export function inputFrameToCanonical<TExtra extends string = "never">(
  frame: GenericInputFrame
): CanonicalInputState<TExtra> {
  return {
    axes: {
      moveX: frame.axes?.moveX ?? 0,
      moveY: frame.axes?.moveY ?? 0,
      aimX: frame.axes?.aimX ?? 0,
      aimY: frame.axes?.aimY ?? 0,
    },
    actions: new Set((frame.actions ?? []) as Array<CanonicalActionName<TExtra>>),
    timestamp: frame.timestamp ?? 0,
  };
}
