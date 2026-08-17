import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { World, EventBus, StoryRuntime, CYOAScene, ArcadeKernel, ArcadeState } from "@tiny-aster/core";
import { blindStationGraph } from "../../games/shared/story/BlindStation";
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
  const [energy, setEnergy] = useState<number>(30);
  const [confianzaIA, setConfianzaIA] = useState<number>(0);
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const sceneRef = useRef<CYOAScene | null>(null);
  const runtimeRef = useRef<StoryRuntime | null>(null);

  const refreshState = (runtime: StoryRuntime) => {
    const st = runtime.getState();
    setEvidence((st.variables["evidencia"] as number) || 0);
    setOxygen((st.variables["oxigeno"] as number) || 100);
    setEnergy((st.variables["energia"] as number) || 30);
    setConfianzaIA((st.variables["confianzaIA"] as number) || 0);
    setFlags({ ...st.flags });
  };

  useEffect(() => {
    const world = new World();
    const eventBus = new EventBus();
    world.setResource("EventBus", eventBus);

    const kernel = new ArcadeKernel(eventBus);
    kernel.transitionTo(ArcadeState.LOADING);
    kernel.transitionTo(ArcadeState.MENU);
    kernel.transitionTo(ArcadeState.STORY);

    const runtime = new StoryRuntime(blindStationGraph);
    runtime.setVariable("evidencia", 0);
    runtime.setVariable("oxigeno", 100);
    runtime.setVariable("energia", 30);
    runtime.setVariable("confianzaIA", 0);
    runtimeRef.current = runtime;

    // Listen to gameplay/story events dispatched from BlindStation graph
    eventBus.on("bs:found_evidence", (data: any) => {
      const currentEv = (runtime.getState().variables["evidencia"] as number) || 0;
      runtime.setVariable("evidencia", currentEv + (data?.delta || 1));
      runtime.setFlag("iaMintio", true);
      refreshState(runtime);
    });

    eventBus.on("bs:trust_ares", (data: any) => {
      const currentTrust = (runtime.getState().variables["confianzaIA"] as number) || 0;
      runtime.setVariable("confianzaIA", currentTrust + (data?.delta || 1));
      refreshState(runtime);
    });

    eventBus.on("bs:reactor_activated", (data: any) => {
      runtime.setFlag("reactorActivo", true);
      runtime.setFlag("vioGrabacionSecreta", true);
      runtime.setFlag("iaMintio", true);
      const currentE = (runtime.getState().variables["energia"] as number) || 30;
      runtime.setVariable("energia", currentE + (data?.deltaEnergy || 40));
      refreshState(runtime);
    });

    eventBus.on("bs:power_infirmary_set", () => {
      runtime.setFlag("energiaEnfermeria", true);
      refreshState(runtime);
    });

    eventBus.on("bs:power_comms_set", () => {
      runtime.setFlag("commsActivas", true);
      refreshState(runtime);
    });

    eventBus.on("bs:power_oxygen_set", (data: any) => {
      const currentO = (runtime.getState().variables["oxigeno"] as number) || 100;
      runtime.setVariable("oxigeno", currentO + (data?.deltaOxygen || 30));
      refreshState(runtime);
    });

    eventBus.on("bs:met_doctor", () => {
      runtime.setFlag("encontroDoctora", true);
      runtime.setFlag("sabeQueTripulacionVive", true);
      refreshState(runtime);
    });

    eventBus.on("bs:allied_vega", () => {
      const currentEv = (runtime.getState().variables["evidencia"] as number) || 0;
      runtime.setVariable("evidencia", currentEv + 1);
      refreshState(runtime);
    });

    eventBus.on("bs:found_secret", () => {
      const currentEv = (runtime.getState().variables["evidencia"] as number) || 0;
      runtime.setVariable("evidencia", currentEv + 2);
      refreshState(runtime);
    });

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
      setNodeId(sceneRef.current.getCurrentNode()?.id || null);
      if (runtimeRef.current) {
        refreshState(runtimeRef.current);
      }
    }
  };

  const handleRestart = () => {
    hapticSelection();
    if (sceneRef.current) {
      sceneRef.current.restart();
      if (runtimeRef.current) {
        runtimeRef.current.setVariable("evidencia", 0);
        runtimeRef.current.setVariable("oxigeno", 100);
        runtimeRef.current.setVariable("energia", 30);
        runtimeRef.current.setVariable("confianzaIA", 0);
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

  const titleText = currentNode?.title || getLocalizedText("blindstation.title");
  const dialogueKey = currentNode?.dialogue?.lines?.[0]?.textKey;
  const descriptionText = getLocalizedText(dialogueKey);

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
          <Text style={styles.statusLabel}>{bsDict.status_energy || "ENERGY"}:</Text>
          <Text style={styles.statusValue}>{energy}%</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusLabel}>{bsDict.status_evidence || "EVIDENCE"}:</Text>
          <Text style={styles.statusValueGold}>{evidence}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.nodeTitle}>{titleText}</Text>
          <Text style={styles.descriptionText}>{descriptionText}</Text>

          {flags.iaMintio && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertText}>⚠️ ALERT: ARES Misdirection Detected</Text>
            </View>
          )}

          {flags.encontroDoctora && (
            <View style={styles.infoBadge}>
              <Text style={styles.infoText}>🩺 Crew Stasis Active (Dr. Vega Unlocked)</Text>
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
