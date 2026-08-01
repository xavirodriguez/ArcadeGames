import { useEffect, useRef, useState } from "react";
import { PlayerProfileService } from "../services/PlayerProfileService";
import { DailyChallengeService } from "../services/DailyChallengeService";
import { LeaderboardService } from "../services/LeaderboardService";
import type { PlayerProfile } from "../services/PlayerProfileService";

export interface BaseGameState {
  isGameOver: boolean;
  score?: number;
  scoreP1?: number;
  scoreP2?: number;
  level?: number;
}

export interface UseGameSessionOptions {
  gameId: string;
  isDaily: boolean;
  seed?: number;
  gameState: BaseGameState;
  customStats?: Partial<PlayerProfile["stats"]>;
}

/**
 * Custom hook to centralize post-game progression and daily challenge lifecycle logic.
 * Ensures that XP, daily attempts, and leaderboards are updated reliably and exactly once per session.
 */
export function useGameSession({
  gameId,
  isDaily,
  seed,
  gameState,
  customStats,
}: UseGameSessionOptions) {
  const [showDailyResults, setShowDailyResults] = useState(false);
  const sessionCompletedRef = useRef(false);
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    if (!gameState.isGameOver) {
      setStartTime(Date.now());
    }
  }, [gameState.isGameOver]);

  useEffect(() => {
    if (gameState.isGameOver && !sessionCompletedRef.current) {
      sessionCompletedRef.current = true;

      const finalScore =
        gameState.score ??
        Math.max(gameState.scoreP1 ?? 0, gameState.scoreP2 ?? 0);

      const processProgression = async () => {
        try {
          // Compute survival time in minutes
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const minutesSurvived = Math.max(0, elapsedSeconds / 60);

          // Compute completed phases based on game rules
          let completedPhases = 0;
          if (gameId === "space-invaders" || gameId === "asteroids") {
            completedPhases = Math.max(0, (gameState.level ?? 1) - 1);
          } else if (gameId === "flappybird") {
            completedPhases = Math.floor((gameState.score ?? 0) / 10);
          } else if (gameId === "pong") {
            completedPhases = ((gameState.scoreP1 ?? 0) >= 5 || (gameState.scoreP2 ?? 0) >= 5) ? 1 : 0;
          }

          // Compute performance ratio
          let performanceRatio = 0;
          if (gameId === "space-invaders") {
            const targetScore = 1000 * (gameState.level ?? 1);
            performanceRatio = Math.min(1, Math.max(0, (gameState.score ?? 0) / targetScore));
          } else if (gameId === "asteroids") {
            const targetScore = 1500 * (gameState.level ?? 1);
            performanceRatio = Math.min(1, Math.max(0, (gameState.score ?? 0) / targetScore));
          } else if (gameId === "flappybird") {
            const targetScore = 10;
            performanceRatio = Math.min(1, Math.max(0, (gameState.score ?? 0) / targetScore));
          } else if (gameId === "pong") {
            const maxPoints = Math.max(gameState.scoreP1 ?? 0, gameState.scoreP2 ?? 0);
            performanceRatio = Math.min(1, Math.max(0, maxPoints / 5));
          }

          // Apply normalized XP formula
          const computedXp = Math.round(
            20 * minutesSurvived +
            60 * completedPhases +
            40 * performanceRatio
          );
          const finalXp = Math.max(5, computedXp);

          // Process progression XP
          await PlayerProfileService.addXP(finalXp);

          // 2. Update custom stats if provided
          if (customStats) {
            await PlayerProfileService.updateStats(gameId, customStats);
          }

          // 3. Process Daily Challenge and Leaderboard submissions
          if (isDaily && seed !== undefined) {
            await DailyChallengeService.markAttemptAsUsed(
              gameId,
              finalScore,
              seed,
              0
            );

            const profile = await PlayerProfileService.getProfile();
            await LeaderboardService.submitDailyScore(
              gameId,
              DailyChallengeService.getDateKey(),
              finalScore,
              profile.playerId,
              profile.displayName,
              seed
            );

            setShowDailyResults(true);
          }
        } catch (error) {
          console.error("Error processing game session progression:", error);
        }
      };

      processProgression();
    }

    if (!gameState.isGameOver) {
      sessionCompletedRef.current = false;
    }
  }, [
    gameState.isGameOver,
    gameState.score,
    gameState.scoreP1,
    gameState.scoreP2,
    isDaily,
    seed,
    gameId,
    customStats,
  ]);

  return {
    showDailyResults,
    setShowDailyResults,
  };
}
