import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { World, EventBus, StoryRuntime, CYOAScene, ArcadeKernel, ArcadeState } from "@tiny-aster/core";
import { caveAdventureGraph } from "../../games/shared/story/TheCaveAdventure";
import { useTranslation } from "../../hooks/useTranslation";
import { GameScreen } from "../../components/ui/GameScreen";
import { BackButton } from "../../components/ui/BackButton";
import { GameTitle } from "../../components/ui/GameTitle";
import { NeonButton } from "../../components/ui/NeonButton";
import { hapticSelection } from "../../utils/haptics";
import { colors, spacing, typography } from "../../theme";

export default function CYOAScreen() {
  const { t } = useTranslation();
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState<boolean>(false);

  const sceneRef = useRef<CYOAScene | null>(null);
  const runtimeRef = useRef<StoryRuntime | null>(null);

  useEffect(() => {
    const world = new World();
    const eventBus = new EventBus();
    world.setResource("EventBus", eventBus);

    const kernel = new ArcadeKernel(eventBus);
    kernel.transitionTo(ArcadeState.LOADING);
    kernel.transitionTo(ArcadeState.MENU);
    kernel.transitionTo(ArcadeState.STORY);

    const runtime = new StoryRuntime(caveAdventureGraph);
    runtimeRef.current = runtime;

    // Listen for custom story events like torch acquisition
    eventBus.on("adventure:torch_acquired", () => {
      runtime.setFlag("has_torch", true);
      setHasTorch(true);
    });

    const scene = new CYOAScene(world, runtime, (node) => {
      setNodeId(node.id);
      setHasTorch(!!runtime.getState().flags["has_torch"]);
    });

    sceneRef.current = scene;
    scene.onEnter(world);

    setNodeId(scene.getCurrentNode()?.id || null);

    return () => {
      if (kernel.getState() === ArcadeState.STORY) {
        kernel.transitionTo(ArcadeState.MENU);
      }
    };
  }, []);

  const handleSelectChoice = (choiceId: string) => {
    hapticSelection();
    if (sceneRef.current) {
      sceneRef.current.selectChoice(choiceId);
      setNodeId(sceneRef.current.getCurrentNode()?.id || null);
      if (runtimeRef.current) {
        setHasTorch(!!runtimeRef.current.getState().flags["has_torch"]);
      }
    }
  };

  const handleRestart = () => {
    hapticSelection();
    if (sceneRef.current) {
      sceneRef.current.restart();
      setNodeId(sceneRef.current.getCurrentNode()?.id || null);
      if (runtimeRef.current) {
        setHasTorch(!!runtimeRef.current.getState().flags["has_torch"]);
      }
    }
  };

  const currentNode = sceneRef.current?.getCurrentNode();
  const availableChoices = sceneRef.current?.getAvailableChoices() || [];

  // Safely look up localized text keys or fallback gracefully
  const getLocalizedText = (key?: string) => {
    if (!key) return "";
    const parts = key.split(".");
    if (parts[0] === "adventure" && parts[1]) {
      const advDict = (t as any)?.adventure || {};
      return advDict[parts[1]] || key;
    }
    return key;
  };

  const titleText = currentNode?.title || getLocalizedText("adventure.title");
  const dialogueKey = currentNode?.dialogue?.lines?.[0]?.textKey;
  const descriptionText = getLocalizedText(dialogueKey);

  return (
    <GameScreen>
      <View style={styles.header}>
        <BackButton
          onPress={() => router.back()}
          accessibilityLabel={t?.common?.back || "BACK"}
          accessibilityHint="Returns to main arcade menu"
        />
        <GameTitle>{t?.adventure?.title || "THE CAVE ADVENTURE"}</GameTitle>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.nodeTitle}>{titleText}</Text>
          <Text style={styles.descriptionText}>{descriptionText}</Text>

          {hasTorch && (
            <View style={styles.inventoryBadge}>
              <Text style={styles.inventoryText}>🔥 Item: Torch Active</Text>
            </View>
          )}
        </View>

        <View style={styles.choicesContainer}>
          {availableChoices.map((choice) => {
            const title = getLocalizedText(choice.titleKey);
            const desc = getLocalizedText(choice.descriptionKey);

            return (
              <TouchableOpacity
                key={choice.id}
                style={styles.choiceButton}
                onPress={() => handleSelectChoice(choice.id)}
                accessibilityRole="button"
                accessibilityLabel={title}
                accessibilityHint={desc}
              >
                <Text style={styles.choiceTitle}>{title}</Text>
                {desc ? <Text style={styles.choiceDesc}>{desc}</Text> : null}
              </TouchableOpacity>
            );
          })}

          {currentNode?.isEndNode && (
            <NeonButton
              variant="pink"
              onPress={handleRestart}
              style={styles.restartButton}
              accessibilityLabel={t?.adventure?.restart_title || "Restart Adventure"}
              accessibilityHint="Restores story progress to the cavern entrance"
            >
              {t?.adventure?.restart_title || "RESTART ADVENTURE"}
            </NeonButton>
          )}
        </View>
      </ScrollView>
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  contentContainer: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 12,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
  },
  nodeTitle: {
    color: colors.cyan,
    fontFamily: typography.game,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  descriptionText: {
    color: colors.white,
    fontFamily: typography.game,
    fontSize: typography.sizes.md,
    lineHeight: 24,
  },
  inventoryBadge: {
    marginTop: spacing.lg,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  inventoryText: {
    color: colors.gold,
    fontFamily: typography.game,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  choicesContainer: {
    width: "100%",
    gap: spacing.lg,
  },
  choiceButton: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.pink,
    borderRadius: 8,
    padding: spacing.lg,
  },
  choiceTitle: {
    color: colors.pink,
    fontFamily: typography.game,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  choiceDesc: {
    color: colors.textSecondary,
    fontFamily: typography.game,
    fontSize: typography.sizes.sm,
  },
  restartButton: {
    marginTop: spacing.xl,
    width: "100%",
  },
});
