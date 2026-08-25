import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { World, StoryRuntime, CYOAScene, ArcadeKernel, ArcadeState, EventBus } from "@tiny-aster/core";
import { createBlindStationStory, BlindStationGraph, bootstrapBlindStation } from "../../games/shared/story/BlindStation";
import { useTranslation } from "../../hooks/useTranslation";
import { useStoryRuntime } from "../../hooks/useStoryRuntime";
import { GameScreen } from "../../components/ui/GameScreen";
import { BackButton } from "../../components/ui/BackButton";
import { GameTitle } from "../../components/ui/GameTitle";
import { NeonButton } from "../../components/ui/NeonButton";
import { hapticSelection } from "../../utils/haptics";
import { colors, spacing, typography } from "../../theme";

export default function BlindStationScreen() {
  const { t } = useTranslation();
  const [runtime, setRuntime] = useState<StoryRuntime | null>(null);
  const [eventBus, setEventBus] = useState<EventBus | null>(null);

  const sceneRef = useRef<CYOAScene | null>(null);

  useEffect(() => {
    const world = new World();

    const { runtime: storyRuntime, eventBus: bus, dispose } = createBlindStationStory(world);
    setRuntime(storyRuntime);
    setEventBus(bus);

    const kernel = new ArcadeKernel(bus);
    kernel.transitionTo(ArcadeState.LOADING);
    kernel.transitionTo(ArcadeState.MENU);
    kernel.transitionTo(ArcadeState.STORY);

    const scene = new CYOAScene(world, storyRuntime);

    sceneRef.current = scene;
    scene.onEnter(world);

    return () => {
      if (kernel.getState() === ArcadeState.STORY) {
        kernel.transitionTo(ArcadeState.MENU);
      }
      dispose();
    };
  }, []);

  const storySnapshot = useStoryRuntime(runtime, eventBus);
  const currentNode = storySnapshot.currentNode || sceneRef.current?.getCurrentNode();
  const availableChoices = sceneRef.current?.getAvailableChoices() || [];

  const oxygen = (storySnapshot.variables["oxygen"] as number) ?? 100;
  const trustARES = (storySnapshot.variables["trustARES"] as number) ?? 0;
  const evidence = (storySnapshot.variables["evidence"] as number) ?? 0;
  const flags = storySnapshot.flags;

  const activeObjective = currentNode?.objective
    ? storySnapshot.state?.objectives?.[currentNode.objective.id] || currentNode.objective
    : null;
  const isObjectiveIncomplete = Boolean(activeObjective && !activeObjective.completed);
  const objectiveCurrentCount = activeObjective?.currentCount ?? 0;
  const objectiveTargetCount = activeObjective?.targetCount ?? 1;

  const handleSelectChoice = (choiceId: string) => {
    hapticSelection();
    if (sceneRef.current) {
      sceneRef.current.selectChoice(choiceId);
    }
  };

  const handleAdvanceStory = () => {
    hapticSelection();
    if (runtime) {
      runtime.evaluateTransitions();
    }
  };

  const handleReactorMinigame = () => {
    hapticSelection();
    if (eventBus && activeObjective) {
      eventBus.emit("reactor:module_online", {
        moduleId: `mod_${objectiveCurrentCount + 1}`,
      });
    }
  };

  const handleLabMinigame = () => {
    hapticSelection();
    if (eventBus && activeObjective) {
      eventBus.emit("lab:sample_scanned", {
        sampleId: `sample_${objectiveCurrentCount + 1}`,
      });
    }
  };

  const handleGenericObjective = () => {
    hapticSelection();
    if (eventBus && activeObjective) {
      eventBus.emit(activeObjective.id as keyof import("../../games/shared/story/BlindStation").BlindStationEvents, {
        objectiveId: activeObjective.id,
        increment: 1,
      } as never);
    }
  };

  const handleRestart = () => {
    hapticSelection();
    if (sceneRef.current && runtime) {
      bootstrapBlindStation(runtime);
      sceneRef.current.restart();
    }
  };

  // Safely look up localized text keys or fallback gracefully
  const getLocalizedText = (key?: string) => {
    if (!key) return "";
    const parts = key.split(".");
    if (parts[0] === "blindstation" && parts[1]) {
      const dict = (t as any)?.blindstation || {};
      return dict[parts[1]] || key;
    }
    return key;
  };

  const titleText = currentNode?.title || BlindStationGraph.title;

  // Extract display text & speaker for dialogue, cutscene, or choices
  let dialogueBody = "";
  if (currentNode?.dialogue?.lines?.length) {
    dialogueBody = currentNode.dialogue.lines
      .map((l) => `${l.speakerName ? l.speakerName + ": " : ""}${getLocalizedText(l.textKey)}`)
      .join("\n\n");
  } else if (currentNode?.cutscene?.dialogueQueue?.length) {
    dialogueBody = currentNode.cutscene.dialogueQueue
      .map((l) => `${l.speakerName ? l.speakerName + ": " : ""}${getLocalizedText(l.textKey)}`)
      .join("\n\n");
  }

  const bsDict = (t as any)?.blindstation || {};

  return (
    <GameScreen>
      <View style={styles.header}>
        <BackButton
          onPress={() => router.back()}
          accessibilityLabel={t?.common?.back || "BACK"}
          accessibilityHint="Returns to main arcade menu"
        />
        <GameTitle>{getLocalizedText("blindstation.title") || "LA ESTACIÓN CIEGA"}</GameTitle>
      </View>

      {/* Global Status Bar showing station telemetry */}
      <View style={styles.statusBar}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusLabel}>{bsDict.status_oxygen || "OXYGEN"}:</Text>
          <Text style={styles.statusValue}>{oxygen}%</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusLabel}>{bsDict.status_trust || "ARES TRUST"}:</Text>
          <Text style={styles.statusValue}>{trustARES}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusLabel}>{bsDict.status_evidence || "EVIDENCE"}:</Text>
          <Text style={styles.statusValueGold}>{evidence}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.nodeTitle}>{titleText}</Text>
          {dialogueBody ? <Text style={styles.descriptionText}>{dialogueBody}</Text> : null}

          {currentNode?.objective && (
            <View style={styles.objectiveBox}>
              <Text style={styles.objectiveTitle}>🎯 {getLocalizedText(currentNode.objective.titleKey)}</Text>
              <Text style={styles.objectiveDesc}>{getLocalizedText(currentNode.objective.descriptionKey)}</Text>
              <Text style={styles.objectiveProgress}>
                Progress: {currentNode.objective.currentCount} / {currentNode.objective.targetCount}
              </Text>
            </View>
          )}

          {flags.sawCryoRecord && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertText}>⚠️ ALERT: Pod seals manually overridden</Text>
            </View>
          )}

          {flags.foundVega && (
            <View style={styles.infoBadge}>
              <Text style={styles.infoText}>🩺 Crew Stasis Active (Dr. Vega Awake)</Text>
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

          {!availableChoices.length && currentNode?.transitions?.length && !currentNode?.isEndNode && (
            isObjectiveIncomplete ? (
              currentNode?.sceneToLoad === "reactor_gameplay" || activeObjective?.id === "reactivate_reactor" ? (
                <NeonButton
                  variant="cyan"
                  onPress={handleReactorMinigame}
                  style={styles.restartButton}
                  accessibilityLabel="Connect Reactor Module"
                  accessibilityHint="Connects a transfer module in the reactor minigame"
                >
                  {`⚡ CONNECT MODULE (${objectiveCurrentCount + 1}/${objectiveTargetCount})`}
                </NeonButton>
              ) : currentNode?.sceneToLoad === "lab_gameplay" || activeObjective?.id === "scan_samples" ? (
                <NeonButton
                  variant="cyan"
                  onPress={handleLabMinigame}
                  style={styles.restartButton}
                  accessibilityLabel="Scan Sample"
                  accessibilityHint="Scans a lunar sample in the lab minigame"
                >
                  {`🔬 SCAN SAMPLE (${objectiveCurrentCount + 1}/${objectiveTargetCount})`}
                </NeonButton>
              ) : (
                <NeonButton
                  variant="cyan"
                  onPress={handleGenericObjective}
                  style={styles.restartButton}
                  accessibilityLabel="Progress Objective"
                  accessibilityHint="Advances objective progress"
                >
                  {`🎯 PROGRESS OBJECTIVE (${objectiveCurrentCount + 1}/${objectiveTargetCount})`}
                </NeonButton>
              )
            ) : (
              <NeonButton
                variant="cyan"
                onPress={handleAdvanceStory}
                style={styles.restartButton}
                accessibilityLabel="Continue"
                accessibilityHint="Advances to the next node"
              >
                CONTINUE ➔
              </NeonButton>
            )
          )}

          {currentNode?.isEndNode && (
            <NeonButton
              variant="pink"
              onPress={handleRestart}
              style={styles.restartButton}
              accessibilityLabel={bsDict.choice_restart_title || "Restart Simulation"}
              accessibilityHint="Restores simulation state to cryo pod awakening"
            >
              {bsDict.choice_restart_title || "RESTART SIMULATION"}
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
  statusBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusLabel: {
    color: colors.textSecondary,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
  },
  statusValue: {
    color: colors.cyan,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  statusValueGold: {
    color: colors.gold,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  contentContainer: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    maxWidth: 640,
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
  objectiveBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    borderWidth: 1,
    borderColor: colors.cyan,
    borderRadius: 8,
  },
  objectiveTitle: {
    color: colors.cyan,
    fontFamily: typography.game,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  objectiveDesc: {
    color: colors.textSecondary,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
  },
  objectiveProgress: {
    color: colors.gold,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  alertBadge: {
    marginTop: spacing.lg,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 0, 85, 0.15)",
    borderWidth: 1,
    borderColor: colors.pink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  alertText: {
    color: colors.pink,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  infoBadge: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 240, 255, 0.15)",
    borderWidth: 1,
    borderColor: colors.cyan,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  infoText: {
    color: colors.cyan,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
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
