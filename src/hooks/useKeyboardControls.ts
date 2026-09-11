import { useEffect } from "react";
import { Platform } from "react-native";
import { IGame } from "@tiny-aster/core";

/**
 * Custom hook to register window-level keyboard listeners on Web platforms.
 * Translates pressed keys to abstract actions and routes them directly to
 * game.setInputState() using the React Bridge pattern.
 */
export function useKeyboardControls(game: IGame | null, isReady: boolean, onInput?: (input: any) => void) {
  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) {
      return;
    }

    // Keep track of active keyboard states
    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeKeys.has(e.code)) return; // Prevent repeated triggers
      activeKeys.add(e.code);
      updateGameInput([e.code]);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!activeKeys.has(e.code)) return;
      activeKeys.delete(e.code);
      updateGameInput([e.code]);
    };

    const handleBlur = () => {
      activeKeys.clear();
      updateGameInput(); // Empty args triggers a full reset payload
    };

    const updateGameInput = (affectedKeys?: string[]) => {
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
      const moveUp = activeKeys.has("ArrowUp") || activeKeys.has("KeyW");
      const moveDown = activeKeys.has("ArrowDown") || activeKeys.has("KeyS");
      const moveLeft = activeKeys.has("ArrowLeft") || activeKeys.has("KeyA");
      const moveRight = activeKeys.has("ArrowRight") || activeKeys.has("KeyD");
      const p1Left = activeKeys.has("ArrowLeft") || activeKeys.has("KeyA");
      const p1Right = activeKeys.has("ArrowRight") || activeKeys.has("KeyD");
      const p1Launch = activeKeys.has("Space") || activeKeys.has("ArrowUp") || activeKeys.has("KeyW");

      const fullPayload = {
        rotateLeft,
        rotateRight,
        moveLeft,
        moveRight,
        moveUp,
        moveDown,
        thrust,
        shoot,
        hyperspace,
        flap,
        glide,
        p1Left,
        p1Right,
        p1Launch,
      };

      let inputPayload: Partial<typeof fullPayload> = fullPayload;

      if (affectedKeys) {
        // Only include actions affected by the keys that changed
        const affectedActions = new Set<keyof typeof fullPayload>();
        const keyMap: Record<string, (keyof typeof fullPayload)[]> = {
          ArrowLeft: ["rotateLeft", "moveLeft", "p1Left"],
          KeyA: ["rotateLeft", "moveLeft", "p1Left"],
          ArrowRight: ["rotateRight", "moveRight", "p1Right"],
          KeyD: ["rotateRight", "moveRight", "p1Right"],
          ArrowUp: ["thrust", "flap", "glide", "moveUp", "p1Launch"],
          KeyW: ["thrust", "flap", "glide", "moveUp", "p1Launch"],
          ArrowDown: ["moveDown"],
          KeyS: ["moveDown"],
          Space: ["shoot", "flap", "glide", "p1Launch"],
          ShiftLeft: ["hyperspace"],
          KeyH: ["hyperspace"],
        };

        for (const code of affectedKeys) {
          const actions = keyMap[code];
          if (actions) {
            actions.forEach(act => affectedActions.add(act));
          }
        }

        if (affectedActions.size > 0) {
          inputPayload = {};
          affectedActions.forEach(act => {
            (inputPayload as any)[act] = fullPayload[act];
          });
        }
      }

      if (Object.keys(inputPayload).length > 0) {
        if (onInput) {
          onInput(inputPayload);
        } else {
          game.setInputState(inputPayload);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);

      // Clean up input state on unmount
      game.setInputState({
        rotateLeft: false,
        rotateRight: false,
        moveLeft: false,
        moveRight: false,
        moveUp: false,
        moveDown: false,
        thrust: false,
        shoot: false,
        hyperspace: false,
        flap: false,
        glide: false,
        p1Left: false,
        p1Right: false,
        p1Launch: false,
      });
    };
  }, [game, isReady]);
}
