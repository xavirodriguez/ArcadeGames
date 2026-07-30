import { useEffect, useRef } from "react";
import { Platform } from "react-native";

interface KeyMapping {
  [key: string]: string[];
}

const DEFAULT_MAPS: KeyMapping = {
  rotateLeft: ["ArrowLeft", "KeyA"],
  moveLeft: ["ArrowLeft", "KeyA"],
  rotateRight: ["ArrowRight", "KeyD"],
  moveRight: ["ArrowRight", "KeyD"],
  thrust: ["ArrowUp", "KeyW"],
  shoot: ["Space"],
  flap: ["Space"],
  hyperspace: ["ShiftLeft", "KeyH"],
};

/**
 * Custom Hook for Web Keyboard Controls (React Bridge Input architecture).
 * Listens to keydown and keyup events and forwards logical actions to the provided callback.
 */
export function useKeyboardControls(
  onInput: (input: Record<string, boolean>) => void,
  active: boolean = true
) {
  const onInputRef = useRef(onInput);
  onInputRef.current = onInput;

  useEffect(() => {
    if (Platform.OS !== "web" || !active) {
      return;
    }

    const state: Record<string, boolean> = {};

    const handleKey = (code: string, pressed: boolean) => {
      const changes: Record<string, boolean> = {};
      let hasChanges = false;

      Object.entries(DEFAULT_MAPS).forEach(([action, keys]) => {
        if (keys.includes(code)) {
          if (state[action] !== pressed) {
            state[action] = pressed;
            changes[action] = pressed;
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        onInputRef.current(changes);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Prevent default page scroll on Space or Arrows
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      handleKey(e.code, true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      handleKey(e.code, false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [active]);
}
