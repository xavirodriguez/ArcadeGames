import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import {
  StoryRuntime,
  EventBus,
  BaseGame,
  StoryGraph,
  StoryChoice,
  GameDefinitionRegistry,
  CampaignSaveManager,
  MetaProgressionService,
  ArcadeKernel,
  ArcadeState,
  MiniGameResult,
  StoryEffect,
  RandomService,
  ArcadeOrchestrator,
  MiniGameEncounterRegistry,
  MiniGameRunContext,
  MidGameNarrativeDirector
} from "@tiny-aster/core";
import {
  asteroidsPOCEncounter,
  spaceInvadersPOCEncounter,
  flappyBirdPOCEncounter,
  asteroidsReduxPOCEncounter,
  spaceInvadersReduxPOCEncounter
} from "../src/games/shared/story/StoryEncounters";
import {
  escapeRoute01Encounter,
  keplerPhase2Encounter,
  keplerPhase3Encounter
} from "../src/games/asteroids/story/KeplerEncounters";
import { registerDefaultCampaignGames } from "../src/services/CampaignGameRegistryService";
import { useStoryRuntime } from "../src/hooks/useStoryRuntime";
import { useTranslation } from "../src/hooks/useTranslation";
import { CanvasRenderer } from "./CanvasRenderer";
import { NarrativeDashboard } from "../src/ui/narrative/NarrativeDashboard";
import { applyEndingRewards } from "../src/games/shared/story/EndingRewards";
import { DialogueBoxComponent } from "../src/components/ui/DialogueBoxComponent";
import { NeonButton } from "../src/components/ui/NeonButton";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";

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
  const { t } = useTranslation();

  // Helper to safely resolve localized text keys or fallback gracefully
  const getLocalizedText = useCallback((key?: string): string => {
    if (!key) return "";
    const parts = key.split(".");
    if (parts.length > 1) {
      let curr: any = t;
      for (const part of parts) {
        if (curr && typeof curr === "object" && part in curr) {
          curr = curr[part];
        } else {
          return key;
        }
      }
      return typeof curr === "string" ? curr : key;
    }
    const campaignDict = (t as any)?.campaign || {};
    return campaignDict[key] || key;
  }, [t]);

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

  const midGameDirectorRef = useRef<MidGameNarrativeDirector | null>(null);
  if (!midGameDirectorRef.current) {
    midGameDirectorRef.current = new MidGameNarrativeDirector();
  }

  const metaServiceRef = useRef<MetaProgressionService | null>(null);
  if (!metaServiceRef.current) {
    metaServiceRef.current = customMetaService ?? new MetaProgressionService(undefined, undefined, false);
  }

  const saveManagerRef = useRef<CampaignSaveManager | null>(null);
  if (!saveManagerRef.current) {
    saveManagerRef.current = customSaveManager ?? new CampaignSaveManager();
  }

  const encounterRegistryRef = useRef<MiniGameEncounterRegistry | null>(null);
  if (!encounterRegistryRef.current) {
    const registry = new MiniGameEncounterRegistry();
    registry.register(asteroidsPOCEncounter);
    registry.register(spaceInvadersPOCEncounter);
    registry.register(flappyBirdPOCEncounter);
    registry.register(asteroidsReduxPOCEncounter);
    registry.register(spaceInvadersReduxPOCEncounter);
    registry.register(escapeRoute01Encounter);
    registry.register(keplerPhase2Encounter);
    registry.register(keplerPhase3Encounter);
    encounterRegistryRef.current = registry;
  }

  const arcadeOrchestratorRef = useRef<ArcadeOrchestrator | null>(null);
  if (!arcadeOrchestratorRef.current) {
    arcadeOrchestratorRef.current = new ArcadeOrchestrator({
      runtime: runtimeRef.current!,
      kernel: sharedKernelRef.current!
    });
  }

  const activeRunContextRef = useRef<MiniGameRunContext | null>(null);

  const [activeGame, setActiveGame] = useState<BaseGame | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing Campaign...");
  const [showDashboard, setShowDashboard] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<{ error: Error; gameId: string; seed?: number } | null>(null);
  const [lastResult, setLastResult] = useState<MiniGameResult | null>(null);
  const [lastAppliedEffects, setLastAppliedEffects] = useState<StoryEffect[] | null>(null);

  const activeGameIdRef = useRef<string | null>(null);
  const activeGameSeedRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const campaignPrngRef = useRef<RandomService | null>(null);
  if (!campaignPrngRef.current) {
    let seedValue = 0;
    for (let i = 0; i < slotId.length; i++) {
      seedValue = (seedValue << 5) - seedValue + slotId.charCodeAt(i);
      seedValue |= 0;
    }
    const initialPrngSeed = Math.abs(seedValue) || 123456789;
    campaignPrngRef.current = new RandomService(initialPrngSeed);
  }

  const currentGameRef = useRef<BaseGame | null>(null);
  currentGameRef.current = activeGame;

  /**
   * Submits gameplay outcome results via ArcadeOrchestrator, updates story variables,
   * completes current node objective, and advances narrative transitions.
   */
  const handleGameplayResult = useCallback((result: MiniGameResult) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    setLastResult(result);

    // 1. Submit result to single pipeline ArcadeOrchestrator (evaluates rules + applies effects)
    const effects = arcadeOrchestratorRef.current?.submitResult(result) ?? [];
    setLastAppliedEffects(effects);

    // 2. Complete objective for current gameplay node upon minigame conclusion
    const currentNode = runtime.getCurrentNode();
    if (currentNode?.objective) {
      runtime.applyEffect({
        type: "completeObjective",
        objectiveId: currentNode.objective.id
      });
    }

    // 3. Update metaprogression minigame mastery upon completion
    if (result.completed && metaServiceRef.current) {
      metaServiceRef.current.incrementMiniGameMastery(result.gameId, 1);
    }

    // 4. Advance narrative transitions out of current node
    runtime.evaluateTransitions();

    // 5. Check if resulting node is terminal ending
    const newCurrentNode = runtime.getCurrentNode();
    if (newCurrentNode?.isEndNode && metaServiceRef.current) {
      metaServiceRef.current.recordRunCompletion(newCurrentNode.id);
      applyEndingRewards(newCurrentNode.id, metaServiceRef.current);
    }
  }, []);

  // Reactively synchronized StoryRuntime state hook
  const { currentNode, flags } = useStoryRuntime(runtimeRef.current, eventBusRef.current);
  const availableChoices: StoryChoice[] = currentNode?.choices || [];
  const isEndNode = Boolean(
    currentNode &&
    (currentNode.isEndNode ||
     currentNode.meta?.isEndNode ||
     (!currentNode.transitions?.length && !currentNode.choices?.length && currentNode.type !== "gameplay"))
  );

  /**
   * Switches the active minigame by resolving the target gameId via GameDefinitionRegistry
   * and instantiating the BaseGame simulation instance with narrative modifiers.
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
      arcadeOrchestratorRef.current?.reset();

      let newGame: BaseGame;
      const normalizedId = GameDefinitionRegistry.normalizeId(gameId);
      const seed = overrideSeed ?? campaignPrngRef.current!.nextInt(1, 0x7FFFFFFF);
      console.log(`[CampaignScreen] Deterministic session seed generated for (${gameId}): ${seed}`);

      sessionStartTimeRef.current = Date.now();
      activeGameIdRef.current = gameId;
      activeGameSeedRef.current = seed;

      const runtime = runtimeRef.current;
      const activeNode = runtime?.getCurrentNode();
      const currentSnapshot = runtime?.getState() ?? {
        graphId: null,
        currentNodeId: null,
        flags: {},
        variables: {},
        selectedChoices: [],
        objectives: {},
        history: []
      };

      // Resolve encounter definition from registry without hardcoded if/else logic
      const encounterIdMeta = typeof activeNode?.meta?.encounterId === "string" ? activeNode.meta.encounterId : undefined;
      const encounter = encounterRegistryRef.current!.resolve(normalizedId, encounterIdMeta);

      // Start run in ArcadeOrchestrator to calculate narrative modifiers via MiniGameModifierResolver
      const runContext = arcadeOrchestratorRef.current!.startRun(
        encounter,
        currentSnapshot,
        activeNode?.id,
        seed
      );
      activeRunContextRef.current = runContext;

      const definition = GameDefinitionRegistry.resolve(normalizedId);
      // Create simulation passing seed, shared campaign kernel, and narrative modifiers
      newGame = definition.createSimulation(seed, {
        modifiers: runContext.modifiers,
        gameOptions: { seed, modifiers: runContext.modifiers }
      }) as BaseGame;

      await newGame.init();

      arcadeOrchestratorRef.current!.notifyPlaying();

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
      arcadeOrchestratorRef.current?.reportError(errorObj);
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
    const midGameDirector = midGameDirectorRef.current!;

    runtime.bindEventBus(eventBus);
    midGameDirector.bindEventBus(eventBus, runtime);

    // Handle scene / gameplay change requests from story runtime
    const unsubScene = eventBus.on("story:scene_change", (data: { sceneToLoad?: unknown; gameId?: unknown }) => {
      if (!isSubscribed) return;
      const targetGameId = (data.sceneToLoad || data.gameId) as string | undefined;
      if (targetGameId) {
        switchGame(targetGameId);
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
          durationMs: Math.max(0, Date.now() - sessionStartTimeRef.current),
          metrics: {},
          secretsFound: []
        };
      }

      // Allow MidGameNarrativeDirector to process performance variables
      midGameDirector.processMiniGameResult(result, runtime);

      handleGameplayResult(result);
    });

    // Initialize story runtime graph
    if (graph) {
      runtime.loadGraph(graph, true);
      const entryNode = runtime.getCurrentNode();
      const sceneFromMeta = typeof entryNode?.meta?.sceneToLoad === "string" ? entryNode.meta.sceneToLoad : undefined;
      const initialScene = entryNode?.sceneToLoad || sceneFromMeta || defaultGameId;
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
      arcadeOrchestratorRef.current?.reset();
      runtimeRef.current.loadGraph(graph, true);
      const entryNode = runtimeRef.current.getCurrentNode();
      const sceneFromMeta = typeof entryNode?.meta?.sceneToLoad === "string" ? entryNode.meta.sceneToLoad : undefined;
      const initialScene = entryNode?.sceneToLoad || sceneFromMeta || defaultGameId;
      switchGame(initialScene);
    }
  }, [graph, defaultGameId, switchGame]);

  // Retry minigame handler with checkpoint restoration
  const handleRetryMinigame = useCallback(() => {
    if (!loadError) return;
    const runtime = runtimeRef.current;
    const activeNode = runtime?.getCurrentNode();

    // Restore checkpoint if specified on current node
    const checkpointId = typeof activeNode?.meta?.checkpointId === "string"
      ? activeNode.meta.checkpointId
      : activeNode?.checkpoint && activeNode?.id
        ? activeNode.id
        : undefined;

    if (checkpointId) {
      runtime?.forkAt(checkpointId);
    }

    switchGame(loadError.gameId, loadError.seed);
  }, [loadError, switchGame]);

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
      setStatusMessage(getLocalizedText("campaign.save_success") || "Campaign Saved Successfully!");
    } catch (err: unknown) {
      console.error("[CampaignScreen] Save failed:", err);
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [slotId, getLocalizedText, onError]);

  // Load campaign state handler
  const handleLoad = useCallback(async () => {
    try {
      const envelope = await saveManagerRef.current!.loadCampaign(
        slotId,
        runtimeRef.current!,
        metaServiceRef.current!
      );

      if (envelope) {
        arcadeOrchestratorRef.current?.reset();
        const runtime = runtimeRef.current!;
        const restoredNode = runtime.getCurrentNode();
        const sceneFromMeta = typeof restoredNode?.meta?.sceneToLoad === "string" ? restoredNode.meta.sceneToLoad : undefined;
        const targetGame = envelope.activeGameId || restoredNode?.sceneToLoad || sceneFromMeta || defaultGameId;
        await switchGame(targetGame, envelope.activeGameSeed);
        setStatusMessage(getLocalizedText("campaign.load_success") || "Campaign Loaded Successfully!");
      }
    } catch (err: unknown) {
      console.error("[CampaignScreen] Load failed:", err);
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [slotId, defaultGameId, switchGame, getLocalizedText, onError]);

  // Cutscene or dialogue queue assembly
  const activeCutsceneQueue = currentNode?.type === "cutscene"
    ? currentNode.cutscene?.dialogueQueue
    : undefined;

  const activeDialogueQueue = currentNode?.type === "dialogue" && currentNode.dialogue?.lines
    ? currentNode.dialogue.lines
    : undefined;

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
          <Text style={styles.placeholderText}>
            {getLocalizedText("campaign.no_game_loaded") || "No Active Game Loaded"}
          </Text>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingText}>{statusMessage}</Text>
        </View>
      )}

      {/* Error Retry Overlay */}
      {loadError && !isLoading && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>
            ⚠️ {getLocalizedText("campaign.error_loading") || "Error loading minigame"}
          </Text>
          <Text style={styles.errorMessage}>{loadError.error.message}</Text>
          <NeonButton
            variant="pink"
            onPress={handleRetryMinigame}
            accessibilityLabel={getLocalizedText("campaign.retry") || "Retry"}
            accessibilityHint="Restores narrative checkpoint and retries minigame"
          >
            {getLocalizedText("campaign.retry") || "Reintentar"}
          </NeonButton>
        </View>
      )}

      {/* Narrative Dialogue, Cutscene & Choices Overlay Layer */}
      {currentNode && !isEndNode && (
        <View style={styles.narrativeOverlay}>
          {currentNode.title && (
            <Text style={styles.nodeTitle}>{getLocalizedText(currentNode.title)}</Text>
          )}

          {/* Active State Badges */}
          <View style={styles.badgeContainer}>
            {flags?.heroicEntry === true && (
              <View style={styles.stateBadge}>
                <Text style={styles.badgeText}>
                  {getLocalizedText("campaign.heroic_active") || "⚔️ MODO HEROICO ACTIVO"}
                </Text>
              </View>
            )}
            {flags?.heroicEntry === false && (
              <View style={[styles.stateBadge, { borderColor: colors.blue }]}>
                <Text style={[styles.badgeText, { color: colors.blueLight }]}>
                  {getLocalizedText("campaign.tactical_active") || "🛡️ ASISTENCIA TÁCTICA ACTIVA"}
                </Text>
              </View>
            )}
            {activeRunContextRef.current?.modifiers?.map((mod) => (
              <View key={mod.id} style={[styles.stateBadge, { borderColor: colors.green }]}>
                <Text style={[styles.badgeText, { color: colors.green }]}>
                  ⚡ {mod.name || mod.targetProperty}
                </Text>
              </View>
            ))}
          </View>

          {/* Active Objective Box */}
          {currentNode.objective && (
            <View style={styles.objectiveBox}>
              <Text style={styles.objectiveTitle}>
                🎯 {getLocalizedText(currentNode.objective.titleKey)}
              </Text>
              <Text style={styles.objectiveProgress}>
                {currentNode.objective.currentCount} / {currentNode.objective.targetCount}
              </Text>
            </View>
          )}

          {/* Typewriter Dialogue Box for Cutscene */}
          {activeCutsceneQueue && activeCutsceneQueue.length > 0 && (
            <DialogueBoxComponent
              dialogueQueue={activeCutsceneQueue}
              getLocalizedText={getLocalizedText}
              onComplete={() => runtimeRef.current?.evaluateTransitions()}
            />
          )}

          {/* Typewriter Dialogue Box for Dialogue */}
          {activeDialogueQueue && activeDialogueQueue.length > 0 && (
            <DialogueBoxComponent
              dialogueQueue={activeDialogueQueue}
              getLocalizedText={getLocalizedText}
            />
          )}

          {/* Available Narrative Choices */}
          <View style={styles.choicesContainer}>
            {availableChoices.map((choice) => (
              <NeonButton
                key={choice.id}
                variant="cyan"
                bordered
                onPress={() => handleSelectChoice(choice.id)}
                accessibilityLabel={getLocalizedText(choice.titleKey)}
                accessibilityHint={choice.descriptionKey ? getLocalizedText(choice.descriptionKey) : undefined}
                style={styles.choiceButton}
              >
                {getLocalizedText(choice.titleKey)}
              </NeonButton>
            ))}
          </View>
        </View>
      )}

      {/* Terminal Node / Campaign Completion Overlay */}
      {isEndNode && currentNode && (
        <View style={styles.endNodeOverlay}>
          <Text style={styles.endNodeTitle}>
            🏆 {getLocalizedText("campaign.completed_title") || "Campaign Completed"}
          </Text>
          {currentNode.dialogue?.lines?.map((line, idx) => (
            <Text key={line.id || `line_${idx}`} style={styles.dialogueText}>
              {line.speakerName ? `${line.speakerName}: ` : ""}
              {getLocalizedText(line.textKey)}
            </Text>
          ))}
          {currentNode.cutscene?.dialogueQueue?.map((line, idx) => (
            <Text key={`end_cs_${idx}`} style={styles.cutsceneDialogue}>
              {line.speakerName ? `${line.speakerName}: ` : ""}
              {getLocalizedText(line.textKey)}
            </Text>
          ))}
          <NeonButton
            variant="green"
            onPress={handleRestartCampaign}
            accessibilityLabel={getLocalizedText("campaign.restart_campaign") || "Restart Campaign"}
            accessibilityHint="Restarts campaign from initial story graph entry node"
            style={styles.restartButton}
          >
            {getLocalizedText("campaign.restart_campaign") || "Restart Campaign"}
          </NeonButton>
        </View>
      )}

      {/* Quick Save / Load / Narrative Debug Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setShowDashboard(!showDashboard)}
          accessibilityRole="button"
          accessibilityLabel={
            showDashboard
              ? getLocalizedText("campaign.hide_debug") || "Hide Debug"
              : getLocalizedText("campaign.debug_narrative") || "Narrative Debug"
          }
          accessibilityHint="Toggles the narrative introspection debug panel"
        >
          <Text style={styles.toolbarText}>
            {showDashboard
              ? `📖 ${getLocalizedText("campaign.hide_debug") || "Hide Debug"}`
              : `📖 ${getLocalizedText("campaign.debug_narrative") || "Narrative Debug"}`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={getLocalizedText("campaign.save") || "Save"}
          accessibilityHint="Saves current campaign progression"
        >
          <Text style={styles.toolbarText}>
            {getLocalizedText("campaign.save") || "Save"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={handleLoad}
          accessibilityRole="button"
          accessibilityLabel={getLocalizedText("campaign.load") || "Load"}
          accessibilityHint="Loads saved campaign progression"
        >
          <Text style={styles.toolbarText}>
            {getLocalizedText("campaign.load") || "Load"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Introspection Dashboard Overlay */}
      {runtimeRef.current && (
        <NarrativeDashboard
          storyRuntime={runtimeRef.current}
          isVisible={showDashboard}
          onToggle={() => setShowDashboard(false)}
          lastResult={lastResult}
          lastAppliedEffects={lastAppliedEffects}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundDark,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingText: {
    color: colors.cyan,
    marginTop: spacing.md,
    fontSize: 14,
    fontWeight: "bold",
  },
  narrativeOverlay: {
    position: "absolute",
    bottom: 40,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: "rgba(10, 15, 30, 0.92)",
    borderColor: colors.cyan,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    zIndex: 50,
  },
  nodeTitle: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  badgeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  stateBadge: {
    backgroundColor: "rgba(0, 240, 255, 0.12)",
    borderColor: colors.cyan,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "bold",
  },
  objectiveBox: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.xs,
    marginVertical: spacing.xs,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  objectiveTitle: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "bold",
  },
  objectiveProgress: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  dialogueText: {
    color: colors.white,
    fontSize: 14,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  cutsceneDialogue: {
    color: colors.cyan,
    fontSize: 14,
    marginBottom: spacing.xs,
    fontStyle: "italic",
    lineHeight: 20,
  },
  choicesContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  choiceButton: {
    minWidth: "100%",
    paddingVertical: spacing.sm,
  },
  toolbar: {
    position: "absolute",
    top: 20,
    right: 20,
    flexDirection: "row",
    gap: spacing.xs,
    zIndex: 60,
  },
  toolbarButton: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderColor: colors.cyan,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 4,
  },
  toolbarText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "bold",
  },
  endNodeOverlay: {
    position: "absolute",
    bottom: 40,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: "rgba(20, 10, 35, 0.95)",
    borderColor: colors.gold,
    borderWidth: 2,
    borderRadius: 8,
    padding: spacing.lg,
    alignItems: "center",
    zIndex: 70,
  },
  endNodeTitle: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: spacing.sm,
  },
  restartButton: {
    marginTop: spacing.md,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30, 5, 5, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    zIndex: 110,
  },
  errorTitle: {
    color: colors.red,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  errorMessage: {
    color: colors.white,
    fontSize: 14,
    textAlign: "center",
    marginBottom: spacing.md,
  },
});
