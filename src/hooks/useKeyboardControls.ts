import { useEffect, useRef } from "react";
import { Platform } from "react-native";

/**
 * Custom hook to register keyboard controls on the Web platform.
 * Binds keys like arrows/WASD/Space/Shift and delegates actions directly to
 * game.setInputState() for the React Bridge architecture.
 */
export function useKeyboardControls(game: any) {
  const activeKeys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (Platform.OS !== "web" || !game) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key;

      // Prevent scrolling on space and arrow keys
      if (
        ["Space", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code) ||
        ["Space", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)
      ) {
        e.preventDefault();
      }

      if (code) activeKeys.current[code] = true;
      if (key) activeKeys.current[key] = true;
      updateInputState();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key;
      if (code) activeKeys.current[code] = false;
      if (key) activeKeys.current[key] = false;
      updateInputState();
    };

    const updateInputState = () => {
      if (typeof game.setInputState !== "function") return;

      const keys = activeKeys.current;

      const rotateLeft = !!(keys["ArrowLeft"] || keys["KeyA"] || keys["a"] || keys["A"] || keys["Left"]);
      const rotateRight = !!(keys["ArrowRight"] || keys["KeyD"] || keys["d"] || keys["D"] || keys["Right"]);
      const thrust = !!(keys["ArrowUp"] || keys["KeyW"] || keys["w"] || keys["W"] || keys["Up"]);
      const shoot = !!(keys["Space"] || keys[" "] || keys["Spacebar"]);
      const hyperspace = !!(keys["ShiftLeft"] || keys["KeyH"] || keys["h"] || keys["H"] || keys["Shift"]);

      const inputState: Record<string, any> = {
        rotateLeft,
        rotateRight,
        thrust,
        shoot,
        hyperspace,
        moveLeft: rotateLeft,
        moveRight: rotateRight,
        flap: shoot,
        glide: shoot,
      };

      if (rotateLeft && !rotateRight) {
        inputState.rotationAmount = -1.0;
      } else if (rotateRight && !rotateLeft) {
        inputState.rotationAmount = 1.0;
      } else {
        inputState.rotationAmount = 0.0;
      }

      game.setInputState(inputState);
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [game]);
}
