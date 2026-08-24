import {
  CanonicalActionName,
  CanonicalInputState,
  createEmptyCanonicalInputState,
} from "./CanonicalInput";

/**
 * Raw gamepad input snapshot.
 * @public
 */
export interface RawGamepadState {
  /** Whether the gamepad controller is currently connected. */
  connected: boolean;
  /** Array of analog axis positions on the gamepad. */
  axes: number[];
  /** Array of digital button states on the gamepad. */
  buttons: boolean[];
}

/**
 * Raw input snapshot capturing physical keys pressed and active gamepad states.
 * @public
 */
export interface RawInputState {
  /** Set of physical keyboard keys currently pressed. */
  keysPressed: Set<string>;
  /** Optional raw gamepad hardware state. */
  gamepad?: RawGamepadState;
}

/**
 * Creates an empty RawInputState instance.
 * @public
 */
export function createEmptyRawInputState(): RawInputState {
  return {
    keysPressed: new Set<string>(),
  };
}

/**
 * Binding mapping raw physical keys or gamepad axes to a canonical axis.
 * @public
 */
export interface AxisBinding {
  /** Binding discriminator kind. */
  kind: "axis";
  /** Target canonical input axis mapped by this binding. */
  canonicalAxis: keyof CanonicalInputState["axes"];
  /** Hardware input source descriptor. */
  source:
    | { type: "keyboard"; positiveKey: string; negativeKey: string }
    | { type: "gamepadAxis"; index: number; invert?: boolean; deadzone?: number };
}

/**
 * Binding mapping raw physical key or gamepad button to a canonical action.
 * @public
 */
export interface ActionBinding<TExtra extends string = never> {
  /** Binding discriminator kind. */
  kind: "action";
  /** Target canonical action name mapped by this binding. */
  canonicalAction: CanonicalActionName<TExtra>;
  /** Hardware input source descriptor. */
  source:
    | { type: "keyboard"; key: string }
    | { type: "gamepadButton"; index: number };
}

/**
 * Union of axis and action input bindings.
 * @public
 */
export type InputBinding<TExtra extends string = never> =
  | AxisBinding
  | ActionBinding<TExtra>;

/**
 * Set of configurable input bindings.
 * @public
 */
export type BindingSet<TExtra extends string = never> = InputBinding<TExtra>[];

/**
 * Configurable pure mapper translating raw hardware inputs into a CanonicalInputState.
 * @public
 */
export class InputMapper<TExtra extends string = never> {
  private bindings: BindingSet<TExtra>;

  /** Creates a new InputMapper instance with optional initial bindings. */
  constructor(bindings: BindingSet<TExtra> = []) {
    this.bindings = bindings;
  }

  /** Sets active input bindings. */
  public setBindings(bindings: BindingSet<TExtra>): void {
    this.bindings = bindings;
  }

  /** Gets active input bindings. */
  public getBindings(): BindingSet<TExtra> {
    return [...this.bindings];
  }

  /**
   * Pure mapping function converting RawInputState into CanonicalInputState.
   */
  public map(raw: RawInputState): CanonicalInputState<TExtra> {
    const out = createEmptyCanonicalInputState<TExtra>();

    for (let i = 0; i < this.bindings.length; i++) {
      const binding = this.bindings[i];
      if (binding.kind === "axis") {
        out.axes[binding.canonicalAxis] = this.resolveAxis(
          binding,
          raw,
          out.axes[binding.canonicalAxis]
        );
      } else {
        if (this.resolveAction(binding, raw)) {
          out.actions.add(binding.canonicalAction);
        }
      }
    }

    out.timestamp = Date.now();
    return out;
  }

  private resolveAxis(binding: AxisBinding, raw: RawInputState, current: number): number {
    if (binding.source.type === "keyboard") {
      const pos = raw.keysPressed.has(binding.source.positiveKey) ? 1 : 0;
      const neg = raw.keysPressed.has(binding.source.negativeKey) ? -1 : 0;
      const combined = pos + neg;
      return Math.abs(combined) > Math.abs(current) ? combined : current;
    }

    if (binding.source.type === "gamepadAxis" && raw.gamepad?.connected) {
      let v = raw.gamepad.axes[binding.source.index] ?? 0;
      if (binding.source.invert) v = -v;
      const dz = binding.source.deadzone ?? 0.15;
      v = Math.abs(v) < dz ? 0 : v;
      return Math.abs(v) > Math.abs(current) ? v : current;
    }

    return current;
  }

  private resolveAction(binding: ActionBinding<TExtra>, raw: RawInputState): boolean {
    if (binding.source.type === "keyboard") {
      return raw.keysPressed.has(binding.source.key);
    }

    if (binding.source.type === "gamepadButton" && raw.gamepad?.connected) {
      return !!raw.gamepad.buttons[binding.source.index];
    }

    return false;
  }
}
