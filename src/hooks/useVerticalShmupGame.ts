import { useMemo, useState } from "react";
import { useGame } from "@tiny-aster/react-native";
import { VerticalShmupGame } from "../games/vertical-shmup";
import type { ShmupGameStateComponent, ShmupInputState } from "../games/vertical-shmup";

const INITIAL_STATE: ShmupGameStateComponent = {
  type: "ShmupGameState", score: 0, wave: 1, scrollDistance: 0, isGameOver: false, spawnTimer: 0
};

export function useVerticalShmupGame(started: boolean, seed?: number) {
  const [activeMutators] = useState<readonly never[]>([]);
  const options = useMemo(() => ({ activeMutators }), [activeMutators]);
  return useGame<VerticalShmupGame, ShmupGameStateComponent, ShmupInputState>(
    started ? VerticalShmupGame : null,
    false,
    { gameOptions: options, initialState: INITIAL_STATE, seed }
  );
}
