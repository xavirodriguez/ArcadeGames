import { useEffect } from "react";
import { Platform } from "react-native";
import type { GalaxianConfig } from "../types/GalaxianConfigSchema";
import type { GalaxianGame } from "../GalaxianGame";
import type { GalaxianInputState } from "../types/GalaxianTypes";
import {
  resolveGalaxianKeyActions,
  type GalaxianControlInput,
} from "../input/GalaxianKeyboardBindings";

/**
 * Routes the configured Galaxian keyboard bindings through the same input bridge
 * used by touch controls. The generic controls hook intentionally remains
 * unchanged for other games.
 */
export function useGalaxianKeyboardControls(
  game: GalaxianGame | null,
  isReady: boolean,
  onInput: (input: GalaxianControlInput) => void
): void {
  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) return;

    const keys = game.getWorld().getResource<GalaxianConfig>("GameConfig")?.KEYS;
    if (!keys) return;

    const activeKeys = new Set<string>();

    const onKeyChange = (event: KeyboardEvent, isPressed: boolean): void => {
      const actions = resolveGalaxianKeyActions(event.code, keys);
      if (actions.length === 0) return;

      event.preventDefault();

      if (isPressed) {
        if (activeKeys.has(event.code)) return;
        activeKeys.add(event.code);
      } else {
        if (!activeKeys.has(event.code)) return;
        activeKeys.delete(event.code);
      }

      const input: GalaxianControlInput = {};
      for (const action of actions) {
        input[action] = isPressed;
      }
      onInput(input);
    };

    const handleKeyDown = (event: KeyboardEvent): void => onKeyChange(event, true);
    const handleKeyUp = (event: KeyboardEvent): void => onKeyChange(event, false);
    const handleBlur = (): void => {
      activeKeys.clear();
      onInput({ moveLeft: false, moveRight: false, shoot: false });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      activeKeys.clear();
      onInput({ moveLeft: false, moveRight: false, shoot: false });
    };
  }, [game, isReady, onInput]);
}
