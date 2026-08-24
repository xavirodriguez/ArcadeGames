import type { InputFrame } from "../network/NetTypes";

/**
 * Standard semantic action names used across minigames.
 * @public
 */
export type CanonicalActionName<TExtra extends string = never> =
  | "fire"
  | "secondary"
  | "boost"
  | "hyperspace"
  | "pause"
  | "confirm"
  | "cancel"
  | TExtra;

/**
 * Standard input state interface capturing analog axes and active actions.
 * @public
 */
export interface CanonicalInputState<TExtra extends string = never> {
  /** Map of standard analog axis values normalized between -1.0 and 1.0. */
  axes: {
    moveX: number;
    moveY: number;
    aimX: number;
    aimY: number;
  };
  /** Set of currently active canonical action names. */
  actions: Set<CanonicalActionName<TExtra>>;
  /** Timestamp when the input frame was recorded. */
  timestamp: number;
}

/**
 * Creates an empty CanonicalInputState with zeroed axes and empty actions.
 * @public
 */
export function createEmptyCanonicalInputState<TExtra extends string = never>(): CanonicalInputState<TExtra> {
  return {
    axes: {
      moveX: 0,
      moveY: 0,
      aimX: 0,
      aimY: 0,
    },
    actions: new Set<CanonicalActionName<TExtra>>(),
    timestamp: 0,
  };
}

/**
 * Converts a CanonicalInputState into a network-compatible InputFrame payload.
 * @public
 */
export function canonicalToInputFrame<TExtra extends string = never>(
  state: CanonicalInputState<TExtra>,
  tick: number,
  protocolVersion: number = 1
): InputFrame {
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
 * Converts a network InputFrame payload into a CanonicalInputState.
 * @public
 */
export function inputFrameToCanonical<TExtra extends string = never>(
  frame: InputFrame
): CanonicalInputState<TExtra> {
  const actions = new Set<CanonicalActionName<TExtra>>();
  if (Array.isArray(frame.actions)) {
    for (let i = 0; i < frame.actions.length; i++) {
      actions.add(frame.actions[i] as CanonicalActionName<TExtra>);
    }
  }

  return {
    axes: {
      moveX: typeof frame.axes?.moveX === "number" ? frame.axes.moveX : 0,
      moveY: typeof frame.axes?.moveY === "number" ? frame.axes.moveY : 0,
      aimX: typeof frame.axes?.aimX === "number" ? frame.axes.aimX : 0,
      aimY: typeof frame.axes?.aimY === "number" ? frame.axes.aimY : 0,
    },
    actions,
    timestamp: frame.timestamp ?? 0,
  };
}
