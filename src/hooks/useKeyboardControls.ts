import { useEffect } from "react";
import { Platform } from "react-native";
import { IGame } from "@tiny-aster/core";

/**
 * Custom hook to register window-level keyboard listeners on Web platforms.
 * Translates pressed keys to abstract actions and routes them directly to
 * game.setInputState() using the React Bridge pattern.
 */
export function useKeyboardControls(game: IGame | null, isReady: boolean) {
  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) {
      return;
    }

    // Keep track of active keyboard states
    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeKeys.has(e.code)) return; // Prevent repeated triggers
      activeKeys.add(e.code);
      updateGameInput();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!activeKeys.has(e.code)) return;
      activeKeys.delete(e.code);
      updateGameInput();
    };

    const updateGameInput = () => {
      // Map across various games:
      // Asteroids/SpaceInvaders use rotateLeft/moveLeft, rotateRight/moveRight, thrust, shoot, hyperspace
      // Flappy Bird uses flap, glide
      const rotateLeft = activeKeys.has("ArrowLeft") || activeKeys.has("KeyA");
      const rotateRight = activeKeys.has("ArrowRight") || activeKeys.has("KeyD");
      const thrust = activeKeys.has("ArrowUp") || activeKeys.has("KeyW");
      const shoot = activeKeys.has("Space");
      const hyperspace = activeKeys.has("ShiftLeft") || activeKeys.has("KeyH");
      const flap = activeKeys.has("Space") || activeKeys.has("ArrowUp") || activeKeys.has("KeyW");
      const glide = activeKeys.has("Space") || activeKeys.has("ArrowUp") || activeKeys.has("KeyW");

      game.setInputState({
        rotateLeft,
        rotateRight,
        moveLeft: rotateLeft,
        moveRight: rotateRight,
        thrust,
        shoot,
        hyperspace,
        flap,
        glide,
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);

      // Clean up input state on unmount
      game.setInputState({
        rotateLeft: false,
        rotateRight: false,
        moveLeft: false,
        moveRight: false,
        thrust: false,
        shoot: false,
        hyperspace: false,
        flap: false,
        glide: false,
      });
    };
  }, [game, isReady]);
}
