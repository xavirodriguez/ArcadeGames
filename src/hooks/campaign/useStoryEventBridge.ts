import { useEffect } from "react";
import {
  EventBus,
  StoryRuntime,
  MidGameNarrativeDirector,
  GameDefinitionRegistry,
  MiniGameResult,
  BaseGame,
  MiniGameRunContext
} from "@tiny-aster/core";

export interface UseStoryEventBridgeOptions {
  eventBus: EventBus;
  runtime: StoryRuntime;
  midGameDirector: MidGameNarrativeDirector;
  activeGameIdRef: React.RefObject<string | null>;
  activeRunContextRef: React.RefObject<MiniGameRunContext | null>;
  sessionStartTimeRef: React.RefObject<number>;
  currentGameRef: React.RefObject<BaseGame | null>;
  onSceneChange: (targetGameId: string) => void;
  onGameOver: (result: MiniGameResult) => void;
}

/**
 * Pure function binding eventBus listeners for StoryRuntime & MidGameNarrativeDirector.
 *
 * @returns Cleanup function to unsubscribe event listeners.
 */
export function setupStoryEventBridge(options: UseStoryEventBridgeOptions): () => void {
  const {
    eventBus,
    runtime,
    midGameDirector,
    activeGameIdRef,
    activeRunContextRef,
    sessionStartTimeRef,
    currentGameRef,
    onSceneChange,
    onGameOver
  } = options;

  let isSubscribed = true;

  runtime.bindEventBus(eventBus);
  midGameDirector.bindEventBus(eventBus, runtime);

  // Handle scene / gameplay change requests from story runtime
  const unsubScene = eventBus.on("story:scene_change", (data: { sceneToLoad?: unknown; gameId?: unknown }) => {
    if (!isSubscribed) return;
    const targetGameId = (data.sceneToLoad || data.gameId) as string | undefined;
    if (targetGameId) {
      onSceneChange(targetGameId);
    }
  });

  // Handle minigame completion via game:over event using real MiniGameResult
  const unsubGameOver = eventBus.on("game:over", () => {
    if (!isSubscribed) return;

    const currentGame = currentGameRef.current;
    const activeGameId = activeGameIdRef.current || "asteroids";
    const activeRunContext = activeRunContextRef.current;

    let result: MiniGameResult;
    if (currentGame && typeof currentGame.getMiniGameResult === "function") {
      result = currentGame.getMiniGameResult({
        runId: activeRunContext?.runId,
        gameId: GameDefinitionRegistry.normalizeId(activeGameId)
      });
    } else {
      result = {
        runId: activeRunContext?.runId || `run_${Date.now()}`,
        gameId: GameDefinitionRegistry.normalizeId(activeGameId),
        score: 0,
        completed: false,
        durationMs: Math.max(0, Date.now() - (sessionStartTimeRef.current || 0)),
        metrics: {},
        secretsFound: []
      };
    }

    // Allow MidGameNarrativeDirector to process performance variables
    midGameDirector.processMiniGameResult(result, runtime);

    onGameOver(result);
  });

  return () => {
    isSubscribed = false;
    unsubScene();
    unsubGameOver();
  };
}

/**
 * Hook binding StoryRuntime & MidGameNarrativeDirector to central EventBus
 * and managing event subscriptions for 'story:scene_change' and 'game:over'.
 */
export function useStoryEventBridge(options: UseStoryEventBridgeOptions): void {
  useEffect(() => {
    return setupStoryEventBridge(options);
  }, [
    options.eventBus,
    options.runtime,
    options.midGameDirector,
    options.activeGameIdRef,
    options.activeRunContextRef,
    options.sessionStartTimeRef,
    options.currentGameRef,
    options.onSceneChange,
    options.onGameOver
  ]);
}
