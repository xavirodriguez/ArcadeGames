import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import {
  StoryRuntime,
  EventBus,
  BaseGame,
  StoryGraph,
  StoryNode,
  StoryChoice,
  GameDefinitionRegistry,
  CampaignSaveManager,
  MetaProgressionService,
  ArcadeKernel,
  ArcadeState,
  MiniGameResult,
  OutcomeRuleEngine,
  StoryEffectApplier
} from "@tiny-aster/core";
import {
  asteroidsPOCEncounter,
  spaceInvadersPOCEncounter,
  asteroidsReduxPOCEncounter
} from "../src/games/shared/story/StoryEncounters";
import { registerDefaultCampaignGames } from "../src/services/CampaignGameRegistryService";
import { useStoryRuntime } from "../src/hooks/useStoryRuntime";
import { CanvasRenderer } from "./CanvasRenderer";
import { NarrativeDashboard } from "../src/ui/narrative/NarrativeDashboard";

export interface CampaignScreenProps {
  /** Initial StoryGraph asset to start campaign. */
  graph?: StoryGraph;
  /** Storage slot ID for persistence operations (defaults to "default_slot"). */
  slotId?: string;
  /** Custom initial game ID to start if graph entry does not specify sceneToLoad. */
  defaultGameId?: string;
  /** Optional MetaProgressionService instance override. */
  metaService?: MetaProgressionService;
  /** Optional CampaignSaveManager instance override. */
  saveManager?: CampaignSaveManager;
  /** Optional shared ArcadeKernel instance for global state transition orchestration. */
  arcadeKernel?: ArcadeKernel;
  /** Callback fired when campaign runtime encounters an error. */
  onError?: (error: Error) => void;
}

/**
 * Orchestrator component managing multi-game campaign flow, narrative runtime state,
 * and game definition resolution over the unified engine architecture.
 */
export const CampaignScreen: React.FC<CampaignScreenProps> = ({
  graph,
  slotId = "default_slot",
  defaultGameId = "echorunner",
  metaService: customMetaService,
  saveManager: customSaveManager,
  arcadeKernel: customArcadeKernel,
  onError
}) => {
  // Ensure default campaign games and game definitions are registered on mount
  useEffect(() => {
    registerDefaultCampaignGames();
  }, []);

  const eventBusRef = useRef<EventBus | null>(null);
  if (!eventBusRef.current) {
    eventBusRef.current = new EventBus();
  }

  const sharedKernelRef = useRef<ArcadeKernel | null>(null);
  if (!sharedKernelRef.current) {
    sharedKernelRef.current = customArcadeKernel ?? new ArcadeKernel(eventBusRef.current);
  }

  const runtimeRef = useRef<StoryRuntime | null>(null);
  if (!runtimeRef.current) {
    runtimeRef.current = new StoryRuntime();
  }

  const metaServiceRef = useRef<MetaProgressionService | null>(null);
  if (!metaServiceRef.current) {
    metaServiceRef.current = customMetaService ?? new MetaProgressionService(undefined, undefined, false);
  }

  const saveManagerRef = useRef<CampaignSaveManager | null>(null);
  if (!saveManagerRef.current) {
    saveManagerRef.current = customSaveManager ?? new CampaignSaveManager();
  }

  const [activeGame, setActiveGame] = useState<BaseGame | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing Campaign...");
  const [showDashboard, setShowDashboard] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<{ error: Error; gameId: string; seed?: number } | null>(null);

  const activeGameIdRef = useRef<string | null>(null);
  const activeGameSeedRef = useRef<number | null>(null);
  const currentGameRef = useRef<BaseGame | null>(null);
  currentGameRef.current = activeGame;

  const ruleEngineRef = useRef<OutcomeRuleEngine>(new OutcomeRuleEngine());
  const effectApplierRef = useRef<StoryEffectApplier>(new StoryEffectApplier());

  /**
   * Submits gameplay outcome results, applies narrative effects, updates story variables,
   * completes current node objective, and advances narrative transitions.
   */
  const handleGameplayResult = useCallback((result: MiniGameResult) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    // 1. Determine encounter and evaluate outcome rules
    const currentNode = runtime.getCurrentNode();
    let outcomeRules = asteroidsPOCEncounter.outcomeRules;
    if (result.gameId === "space-invaders") {
      outcomeRules = spaceInvadersPOCEncounter.outcomeRules;
    } else if (currentNode?.meta?.encounterId === "poc-asteroids-redux-1") {
      outcomeRules = asteroidsReduxPOCEncounter.outcomeRules;
    }

    const effects = ruleEngineRef.current.evaluate(result, outcomeRules);
    effectApplierRef.current.applyEffects(runtime, effects);

    // 2. Update variables in StoryRuntime if applicable
    const normalizedGameId = GameDefinitionRegistry.normalizeId(result.gameId);
    if (normalizedGameId === "space-invaders") {
      runtime.setVariable("spaceinvadersScore", result.score);
    } else if (normalizedGameId === "asteroids") {
      const currentLvl = (runtime.getVariable("asteroidLevelReached") as number) || 1;
      runtime.setVariable("asteroidLevelReached", currentLvl + 1);
    }

    // 3. Complete objective for current gameplay node upon minigame conclusion
    if (currentNode?.objective) {
      runtime.applyEffect({
        type: "completeObjective",
        objectiveId: currentNode.objective.id
      });
    }

    // 4. Advance narrative transitions out of current node
    runtime.evaluateTransitions();
  }, []);

  // Reactively synchronized StoryRuntime state hook
  const { currentNode } = useStoryRuntime(runtimeRef.current, eventBusRef.current);
  const availableChoices: StoryChoice[] = currentNode?.choices || [];
  const isEndNode = Boolean(
    currentNode &&
    (currentNode.isEndNode ||
     currentNode.meta?.isEndNode ||
     (!currentNode.transitions?.length && !currentNode.choices?.length && currentNode.type !== "gameplay"))
  );

  /**
   * Switches the active minigame by resolving the target gameId via GameDefinitionRegistry
   * and instantiating the BaseGame simulation instance.
   */
  const switchGame = useCallback(async (gameId: string, overrideSeed?: number) => {
    setIsLoading(true);
    setStatusMessage(`Loading minigame (${gameId})...`);
    setLoadError(null);

    try {
      if (currentGameRef.current) {
        currentGameRef.current.destroy();
        setActiveGame(null);
      }

      let newGame: BaseGame;
      const normalizedId = GameDefinitionRegistry.normalizeId(gameId);
      const seed = overrideSeed ?? Math.floor(Math.random() * 0xFFFFFFFF);

      activeGameIdRef.current = gameId;
      activeGameSeedRef.current = seed;

      const definition = GameDefinitionRegistry.resolve(normalizedId);
      // Create pure simulation instance passing seed and shared campaign kernel
      newGame = definition.createSimulation(seed) as BaseGame;

      await newGame.init();

      if (sharedKernelRef.current && sharedKernelRef.current.getState() !== ArcadeState.PLAYING) {
        try {
          if (sharedKernelRef.current.getState() === ArcadeState.BOOT) {
            sharedKernelRef.current.transitionTo(ArcadeState.LOADING);
          }
          if (sharedKernelRef.current.getState() === ArcadeState.LOADING) {
            sharedKernelRef.current.transitionTo(ArcadeState.MENU);
          }
          if (sharedKernelRef.current.getState() === ArcadeState.MENU) {
            sharedKernelRef.current.transitionTo(ArcadeState.PLAYING);
          }
        } catch (e) {
          // Suppress invalid transition errors if kernel is already managed externally
        }
      }

      setActiveGame(newGame);
    } catch (err: unknown) {
      console.error("[CampaignScreen] Failed to switch game:", err);
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setLoadError({ error: errorObj, gameId, seed: overrideSeed });
      if (onError) {
        onError(errorObj);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Main lifecycle setup
  useEffect(() => {
    let isSubscribed = true;
    const eventBus = eventBusRef.current!;
    const runtime = runtimeRef.current!;

    runtime.bindEventBus(eventBus);

    // Handle scene / gameplay change requests from story runtime
    const unsubScene = eventBus.on("story:scene_change", (data: { sceneToLoad?: unknown; gameId?: unknown }) => {
      if (!isSubscribed) return;
      const targetGameId = (data.sceneToLoad || data.gameId) as string | undefined;
      if (targetGameId) {
        switchGame(targetGameId);
      }
    });

    // Handle minigame completion via game:over event
    const unsubGameOver = eventBus.on("game:over", (payload: any) => {
      if (!isSubscribed) return;

      const currentGame = currentGameRef.current;
      const activeGameId = activeGameIdRef.current || "asteroids";
      const statePayload = payload?.state || (currentGame ? currentGame.getGameState() : undefined);
      const score = payload?.score ?? statePayload?.score ?? 0;
      const isGameOver = statePayload?.isGameOver ?? true;
      const isVictory = statePayload?.isVictory ?? statePayload?.victory ?? (score >= 1000);

      const result: MiniGameResult = {
        runId: `run_${Date.now()}`,
        gameId: GameDefinitionRegistry.normalizeId(activeGameId),
        score,
        completed: isVictory || !isGameOver,
        durationMs: 30000,
        metrics: statePayload?.metrics || {},
        secretsFound: []
      };

      handleGameplayResult(result);
    });

    // Initialize story runtime graph
    if (graph) {
      runtime.loadGraph(graph, true);
      const entryNode = runtime.getCurrentNode();
      const initialScene = entryNode?.sceneToLoad || entryNode?.meta?.sceneToLoad || defaultGameId;
      switchGame(initialScene);
    } else {
      switchGame(defaultGameId);
    }

    return () => {
      isSubscribed = false;
      unsubScene();
      unsubGameOver();

      if (currentGameRef.current) {
        currentGameRef.current.destroy();
        currentGameRef.current = null;
      }
    };
  }, [graph, defaultGameId, switchGame, handleGameplayResult]);

  // Choice selection handler
  const handleSelectChoice = useCallback((choiceId: string) => {
    const runtime = runtimeRef.current!;
    runtime.selectChoice(choiceId);
  }, []);

  // Restart campaign handler
  const handleRestartCampaign = useCallback(() => {
    if (graph && runtimeRef.current) {
      runtimeRef.current.loadGraph(graph, true);
      const entryNode = runtimeRef.current.getCurrentNode();
      const initialScene = entryNode?.sceneToLoad || entryNode?.meta?.sceneToLoad || defaultGameId;
      switchGame(initialScene);
    }
  }, [graph, defaultGameId, switchGame]);

  // Save campaign state handler
  const handleSave = useCallback(async () => {
    try {
      await saveManagerRef.current!.saveCampaign(
        slotId,
        runtimeRef.current!,
        metaServiceRef.current!,
        {
          activeGameId: activeGameIdRef.current || undefined,
          activeGameSeed: activeGameSeedRef.current || undefined
        }
      );
      setStatusMessage("Campaign Saved Successfully!");
    } catch (err: unknown) {
      console.error("[CampaignScreen] Save failed:", err);
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [slotId, onError]);

  // Load campaign state handler
  const handleLoad = useCallback(async () => {
    try {
      const envelope = await saveManagerRef.current!.loadCampaign(
        slotId,
        runtimeRef.current!,
        metaServiceRef.current!
      );

      if (envelope) {
        const runtime = runtimeRef.current!;
        const restoredNode = runtime.getCurrentNode();
        const targetGame = envelope.activeGameId || restoredNode?.sceneToLoad || restoredNode?.meta?.sceneToLoad || defaultGameId;
        await switchGame(targetGame, envelope.activeGameSeed);
        setStatusMessage("Campaign Loaded Successfully!");
      }
    } catch (err: unknown) {
      console.error("[CampaignScreen] Load failed:", err);
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [slotId, defaultGameId, switchGame, onError]);

  return (
    <View style={styles.container}>
      {/* Active Minigame Rendering Layer */}
      {activeGame ? (
        <CanvasRenderer
          world={activeGame.world as any}
          gameLoop={activeGame.getGameLoop()}
        />
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>No Active Game Loaded</Text>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00ffcc" />
          <Text style={styles.loadingText}>{statusMessage}</Text>
        </View>
      )}

      {/* Error Retry Overlay */}
      {loadError && !isLoading && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>⚠️ Error al cargar minijuego</Text>
          <Text style={styles.errorMessage}>{loadError.error.message}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => switchGame(loadError.gameId, loadError.seed)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Narrative Dialogue & Choices Overlay Layer */}
      {currentNode && !isEndNode && (
        <View style={styles.narrativeOverlay}>
          {currentNode.title && (
            <Text style={styles.nodeTitle}>{currentNode.title}</Text>
          )}

          {currentNode.dialogue?.lines?.map((line, idx) => (
            <Text key={line.id || `line_${idx}`} style={styles.dialogueText}>
              {line.speakerName ? `${line.speakerName}: ` : ""}
              {line.textKey}
            </Text>
          ))}

          {/* Available Narrative Choices */}
          <View style={styles.choicesContainer}>
            {availableChoices.map((choice) => (
              <TouchableOpacity
                key={choice.id}
                style={styles.choiceButton}
                onPress={() => handleSelectChoice(choice.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.choiceText}>{choice.titleKey}</Text>
                {choice.descriptionKey && (
                  <Text style={styles.choiceSubtext}>{choice.descriptionKey}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Terminal Node / Campaign Completion Overlay */}
      {isEndNode && currentNode && (
        <View style={styles.endNodeOverlay}>
          <Text style={styles.endNodeTitle}>🏆 Campaign Completed</Text>
          {currentNode.dialogue?.lines?.map((line, idx) => (
            <Text key={line.id || `line_${idx}`} style={styles.dialogueText}>
              {line.speakerName ? `${line.speakerName}: ` : ""}
              {line.textKey}
            </Text>
          ))}
          <TouchableOpacity
            style={styles.restartButton}
            onPress={handleRestartCampaign}
            activeOpacity={0.8}
          >
            <Text style={styles.restartButtonText}>Restart Campaign</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Save / Load / Narrative Debug Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setShowDashboard(!showDashboard)}
        >
          <Text style={styles.toolbarText}>
            {showDashboard ? "Hide Debug" : "📖 Narrative Debug"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={handleSave}>
          <Text style={styles.toolbarText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={handleLoad}>
          <Text style={styles.toolbarText}>Load</Text>
        </TouchableOpacity>
      </View>

      {/* Introspection Dashboard Overlay */}
      {runtimeRef.current && (
        <NarrativeDashboard
          storyRuntime={runtimeRef.current}
          isVisible={showDashboard}
          onToggle={() => setShowDashboard(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050510",
  },
  placeholderText: {
    color: "#666",
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingText: {
    color: "#00ffcc",
    marginTop: 12,
    fontSize: 14,
    fontWeight: "bold",
  },
  narrativeOverlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(10, 15, 30, 0.9)",
    borderColor: "#00ffcc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    zIndex: 50,
  },
  nodeTitle: {
    color: "#00ffcc",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  dialogueText: {
    color: "#ffffff",
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  choicesContainer: {
    marginTop: 12,
    gap: 8,
  },
  choiceButton: {
    backgroundColor: "rgba(0, 255, 204, 0.15)",
    borderColor: "#00ffcc",
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  choiceText: {
    color: "#00ffcc",
    fontSize: 14,
    fontWeight: "600",
  },
  choiceSubtext: {
    color: "#88ccff",
    fontSize: 12,
    marginTop: 2,
  },
  toolbar: {
    position: "absolute",
    top: 20,
    right: 20,
    flexDirection: "row",
    gap: 10,
    zIndex: 60,
  },
  toolbarButton: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderColor: "#00ffcc",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  toolbarText: {
    color: "#00ffcc",
    fontSize: 12,
    fontWeight: "bold",
  },
  endNodeOverlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(20, 10, 35, 0.95)",
    borderColor: "#ffcc00",
    borderWidth: 2,
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    zIndex: 70,
  },
  endNodeTitle: {
    color: "#ffcc00",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  restartButton: {
    marginTop: 16,
    backgroundColor: "rgba(255, 204, 0, 0.2)",
    borderColor: "#ffcc00",
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  restartButtonText: {
    color: "#ffcc00",
    fontSize: 14,
    fontWeight: "bold",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30, 5, 5, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 110,
  },
  errorTitle: {
    color: "#ff4444",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  errorMessage: {
    color: "#ffffff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "rgba(255, 68, 68, 0.2)",
    borderColor: "#ff4444",
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: "#ff4444",
    fontSize: 14,
    fontWeight: "bold",
  },
});
