import { useMemo } from "react";
import { useGame } from "@tiny-aster/react-native";
import { ArkanoidGame } from "../games/arkanoid/ArkanoidGame";
import type { ArkanoidStateComponent, ArkanoidInput } from "../games/arkanoid/types/ArkanoidTypes";
import { ExpoAssetProvider } from "../providers/ExpoAssetProvider";

const expoAssetProvider = new ExpoAssetProvider();

export const useArkanoidGame = (started: boolean, seed?: number) => {
  const gameOptions = useMemo(
    () => ({ seed }),
    [seed]
  );

  return useGame<ArkanoidGame, ArkanoidStateComponent, ArkanoidInput>(
    started ? ArkanoidGame : null,
    false,
    {
      gameOptions,
      seed,
      assetProvider: expoAssetProvider
    }
  );
};
