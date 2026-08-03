import { useMemo } from "react";
import { useGame } from "@tiny-aster/react-native";
import { PongGame, PongState, PongInput } from "../games/pong";
import { ExpoAssetProvider } from "../providers/ExpoAssetProvider";

export const usePongGame = (mode: "local" | "ai" | "online" | null, seed?: number) => {
  const gameOptions = useMemo(
    () => ({ mode, seed }),
    [mode, seed]
  );

  return useGame<PongGame, PongState, PongInput>(
    mode ? PongGame : null,
    mode === "online",
    {
      gameOptions,
      seed,
      assetProvider: new ExpoAssetProvider()
    }
  );
};
