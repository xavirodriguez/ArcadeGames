import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { World, StoryRuntime, CYOAScene, ArcadeKernel, ArcadeState } from "@tiny-aster/core";
import { createBlindStationStory, BlindStationGraph } from "../../games/shared/story/BlindStation";
import { useTranslation } from "../../hooks/useTranslation";
import { GameScreen } from "../../components/ui/GameScreen";
import { BackButton } from "../../components/ui/BackButton";
import { GameTitle } from "../../components/ui/GameTitle";
import { NeonButton } from "../../components/ui/NeonButton";
import { hapticSelection } from "../../utils/haptics";
import { colors, spacing, typography } from "../../theme";

export default function BlindStationScreen() {
  const { t } = useTranslation();
  const [nodeId, setNodeId] = useState<string | null>(null);

  // Dynamic game state variables for UI status indicators
  const [evidence, setEvidence] = useState<number>(0);
  const [oxygen, setOxygen] = useState<number>(100);
  const [trustARES, setTrustARES] = useState<number>(0);
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const sceneRef = useRef<CYOAScene | null>(null);
  const runtimeRef = useRef<StoryRuntime | null>(null);

  const refreshState = (runtime: StoryRuntime) => {
    const st = runtime.getState();
    setEvidence((st.variables["evidence"] as number) || 0);
    setOxygen((st.variables["oxygen"] as number) || 100);
    setTrustARES((st.variables["trustARES"] as number) || 0);
    setFlags({ ...st.flags });
  };

  useEffect(() => {
    const world = new World();

    const { runtime, eventBus } = createBlindStationStory(world);
    runtimeRef.current = runtime;

    const kernel = new ArcadeKernel(eventBus);
    kernel.transitionTo(ArcadeState.LOADING);
    kernel.transitionTo(ArcadeState.MENU);
    kernel.transitionTo(ArcadeState.STORY);

    const scene = new CYOAScene(world, runtime, (node) => {
      setNodeId(node.id);
      refreshState(runtime);
    });

    sceneRef.current = scene;
    scene.onEnter(world);

    setNodeId(scene.getCurrentNode()?.id || null);
    refreshState(runtime);

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
      if (runtimeRef.current) {
        setNodeId(sceneRef.current.getCurrentNode()?.id || null);
        refreshState(runtimeRef.current);
      }
    }
  };

  const handleAdvanceStory = () => {
    hapticSelection();
    if (runtimeRef.current && sceneRef.current) {
      runtimeRef.current.evaluateTransitions();
      setNodeId(sceneRef.current.getCurrentNode()?.id || null);
      refreshState(runtimeRef.current);
    }
  };

  const handleRestart = () => {
    hapticSelection();
    if (sceneRef.current) {
      sceneRef.current.restart();
      if (runtimeRef.current) {
        runtimeRef.current.setVariable("evidence", 0);
        runtimeRef.current.setVariable("oxygen", 100);
        runtimeRef.current.setVariable("trustARES", 0);
        runtimeRef.current.setVariable("trustVega", 0);
      }
      setNodeId(sceneRef.current.getCurrentNode()?.id || null);
      if (runtimeRef.current) {
        refreshState(runtimeRef.current);
      }
    }
  };

  const currentNode = sceneRef.current?.getCurrentNode();
  const availableChoices = sceneRef.current?.getAvailableChoices() || [];

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
            <NeonButton
              variant="cyan"
              onPress={handleAdvanceStory}
              style={styles.restartButton}
              accessibilityLabel="Continue"
              accessibilityHint="Advances to the next node"
            >
              CONTINUE ➔
            </NeonButton>
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
