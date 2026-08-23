import { useEffect } from "react";
import { Platform } from "react-native";
import {
  IGame,
  InputMapper,
  BindingSet,
  CanonicalInputState,
  RawInputState,
  createEmptyRawInputState,
} from "@tiny-aster/core";

/**
 * High-performance RAF polling hook that collects keyboard/gamepad raw inputs,
 * passes them through InputMapper, translates them to game-specific payloads,
 * and updates game input state on frame ticks only when inputs actually change.
 */
export function useCanonicalInputControls<TExtra extends string = never>(
  game: IGame | null,
  isReady: boolean,
  bindings: BindingSet<TExtra>,
  translateToGameInput: (canonical: CanonicalInputState<TExtra>) => Record<string, unknown>,
  onInput?: (input: Record<string, unknown>) => void
) {
  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) {
      return;
    }

    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      activeKeys.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.code);
    };

    const handleBlur = () => {
      activeKeys.clear();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    const mapper = new InputMapper<TExtra>(bindings);
    let rafId: number;
    let lastSerialized = "";

    const tick = () => {
      const raw: RawInputState = createEmptyRawInputState();
      raw.keysPressed = new Set(activeKeys);

      if (typeof navigator !== "undefined" && typeof navigator.getGamepads === "function") {
        const gamepads = navigator.getGamepads();
        const pad = gamepads[0];
        if (pad && pad.connected) {
          raw.gamepad = {
            connected: true,
            axes: Array.from(pad.axes),
            buttons: pad.buttons.map(b => (typeof b === "object" ? b.pressed : b === 1.0)),
          };
        }
      }

      const canonical = mapper.map(raw);
      const gameInput = translateToGameInput(canonical);

      const serialized = JSON.stringify(gameInput);
      if (serialized !== lastSerialized) {
        lastSerialized = serialized;
        if (onInput) {
          onInput(gameInput);
        } else {
          game.setInputState(gameInput);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      activeKeys.clear();
    };
  }, [game, isReady, bindings, translateToGameInput, onInput]);
}
