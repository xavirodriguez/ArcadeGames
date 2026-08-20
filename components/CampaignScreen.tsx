import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import {
  StoryRuntime,
  EventBus,
  BaseGame,
  StoryGraph,
  StoryNode,
  StoryChoice,
  CampaignGameResolver,
  CampaignSaveManager,
  MetaProgressionService
} from "@tiny-aster/core";
import { registerDefaultCampaignGames } from "@/src/services/CampaignGameRegistryService";
import { CanvasRenderer } from "./CanvasRenderer";

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
  /** Callback fired when campaign runtime encounters an error. */
  onError?: (error: Error) => void;
}

export const CampaignScreen: React.FC<CampaignScreenProps> = ({
  graph,
  slotId = "default_slot",
  defaultGameId = "echorunner",
  metaService: customMetaService,
  saveManager: customSaveManager,
  onError
}) => {
  // Ensure default campaign games are registered on mount
  useEffect(() => {
    registerDefaultCampaignGames();
  }, []);

  const eventBusRef = useRef<EventBus | null>(null);
  if (!eventBusRef.current) {
    eventBusRef.current = new EventBus();
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
  const [currentNode, setCurrentNode] = useState<StoryNode | null>(null);
  const [availableChoices, setAvailableChoices] = useState<StoryChoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing Campaign...");

  const currentGameRef = useRef<BaseGame | null>(null);
  currentGameRef.current = activeGame;

  // Game switching helper
  const switchGame = useCallback(async (gameId: string) => {
    setIsLoading(true);
    setStatusMessage(`Loading minigame (${gameId})...`);

    try {
      if (currentGameRef.current) {
        currentGameRef.current.destroy();
        setActiveGame(null);
      }

      const newGame = CampaignGameResolver.resolveGame(gameId);
      await newGame.init();

      setActiveGame(newGame);
    } catch (err: any) {
      console.error("[CampaignScreen] Failed to switch game:", err);
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
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

    // Update React UI on node changes
    const unsubNode = eventBus.on("story:node_changed", (data: any) => {
      if (!isSubscribed) return;
      const node: StoryNode | undefined = data.node;
      if (node) {
        setCurrentNode(node);
        setAvailableChoices(node.choices || []);
      }
    });

    // Handle scene / gameplay change requests from story runtime
    const unsubScene = eventBus.on("story:scene_change", (data: any) => {
      if (!isSubscribed) return;
      const targetGameId = data.sceneToLoad || data.gameId;
      if (targetGameId) {
        switchGame(targetGameId);
      }
    });

    // Initialize story runtime graph
    if (graph) {
      runtime.loadGraph(graph, true);
      const entryNode = runtime.getCurrentNode();
      if (entryNode) {
        setCurrentNode(entryNode);
        setAvailableChoices(entryNode.choices || []);

        const initialScene = entryNode.sceneToLoad || entryNode.meta?.sceneToLoad || defaultGameId;
        switchGame(initialScene);
      } else {
        switchGame(defaultGameId);
      }
    } else {
      switchGame(defaultGameId);
    }

    return () => {
      isSubscribed = false;
      unsubNode();
      unsubScene();

      if (currentGameRef.current) {
        currentGameRef.current.destroy();
        currentGameRef.current = null;
      }
    };
  }, [graph, defaultGameId, switchGame]);

  // Choice selection handler
  const handleSelectChoice = useCallback((choiceId: string) => {
    const runtime = runtimeRef.current!;
    runtime.selectChoice(choiceId);
    const updatedNode = runtime.getCurrentNode();
    if (updatedNode) {
      setCurrentNode(updatedNode);
      setAvailableChoices(updatedNode.choices || []);
    }
  }, []);

  // Save campaign state handler
  const handleSave = useCallback(async () => {
    try {
      await saveManagerRef.current!.saveCampaign(
        slotId,
        runtimeRef.current!,
        metaServiceRef.current!
      );
      setStatusMessage("Campaign Saved Successfully!");
    } catch (err: any) {
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
        if (restoredNode) {
          setCurrentNode(restoredNode);
          setAvailableChoices(restoredNode.choices || []);

          const targetGame = restoredNode.sceneToLoad || restoredNode.meta?.sceneToLoad || defaultGameId;
          await switchGame(targetGame);
        }
        setStatusMessage("Campaign Loaded Successfully!");
      }
    } catch (err: any) {
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

      {/* Narrative Dialogue & Choices Overlay Layer */}
      {currentNode && (
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

      {/* Quick Save / Load Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton} onPress={handleSave}>
          <Text style={styles.toolbarText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={handleLoad}>
          <Text style={styles.toolbarText}>Load</Text>
        </TouchableOpacity>
      </View>
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
});
