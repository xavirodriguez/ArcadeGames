import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { ArcadeDebugRun } from "@tiny-aster/core";
import { colors } from "../theme/colors";

export interface ReplayDebuggerProps {
  debugRun: ArcadeDebugRun;
  onStep?: (currentTick: number) => void;
  onRestart?: () => void;
  onClose?: () => void;
}

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4;

/**
 * DEV-only Replay Debugger component for inspecting deterministic arcade replays and narrative outcomes.
 *
 * @remarks
 * Supports Play, Pause, Step, Speed scaling (0.25x to 4x), Restart, and live tick/metrics/rule inspection.
 */
export const ReplayDebugger: React.FC<ReplayDebuggerProps> = ({
  debugRun,
  onStep,
  onRestart,
  onClose
}) => {
  const totalTicks = debugRun.replay.inputs.length;
  const [currentTick, setCurrentTick] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  const timerRef = useRef<any>(null);

  // Synchronize onStep callback cleanly outside state updater
  useEffect(() => {
    if (onStep) {
      onStep(currentTick);
    }
  }, [currentTick, onStep]);

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(10, Math.floor(1000 / (60 * speed)));
      timerRef.current = setInterval(() => {
        setCurrentTick((prev) => {
          if (prev >= totalTicks - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, speed, totalTicks]);

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentTick < totalTicks - 1) {
      setCurrentTick(currentTick + 1);
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentTick(0);
    if (onRestart) onRestart();
  };

  const togglePlay = () => {
    if (currentTick >= totalTicks - 1) {
      setCurrentTick(0);
    }
    setIsPlaying(!isPlaying);
  };

  const currentInput = debugRun.replay.inputs[currentTick] || null;

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.badgeText}>DEV TOOLS</Text>
          <Text style={styles.headerTitle}>REPLAY DEBUGGER</Text>
        </View>
        <Text style={styles.encounterSubtitle}>
          Encounter: <Text style={styles.highlightText}>{debugRun.encounterId}</Text> | Game: {debugRun.runContext.gameId}
        </Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Close Replay Debugger">
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Playback Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlBtn} onPress={togglePlay} accessibilityLabel={isPlaying ? "Pause Replay" : "Play Replay"}>
          <Text style={styles.controlBtnText}>{isPlaying ? "PAUSE" : "PLAY"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={handleStepForward} accessibilityLabel="Step forward one tick">
          <Text style={styles.controlBtnText}>STEP ➔</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={handleRestart} accessibilityLabel="Restart Replay">
          <Text style={styles.controlBtnText}>RESTART</Text>
        </TouchableOpacity>

        {/* Speed Controls */}
        <View style={styles.speedRow}>
          {([0.25, 1, 2, 4] as PlaybackSpeed[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
              onPress={() => setSpeed(s)}
            >
              <Text style={[styles.speedBtnText, speed === s && styles.speedBtnTextActive]}>
                {s}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          TICK: <Text style={styles.highlightText}>{currentTick}</Text> / {totalTicks}
        </Text>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${totalTicks > 0 ? (currentTick / totalTicks) * 100 : 0}%` }
            ]}
          />
        </View>
      </View>

      {/* Inspector Details */}
      <ScrollView style={styles.inspectorScroll}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>CURRENT TICK INPUT</Text>
          <Text style={styles.codeText}>
            {currentInput ? JSON.stringify(currentInput) : "NO INPUT FRAME"}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>EXPECTED RESULT & METRICS</Text>
          <Text style={styles.infoText}>Score: {debugRun.expectedResult.score}</Text>
          <Text style={styles.infoText}>Completed: {debugRun.expectedResult.completed ? "YES" : "NO"}</Text>
          <Text style={styles.infoText}>Duration: {debugRun.expectedResult.durationMs}ms</Text>
          <Text style={styles.subHeader}>Metrics:</Text>
          <Text style={styles.codeText}>{JSON.stringify(debugRun.expectedResult.metrics, null, 2)}</Text>
          <Text style={styles.subHeader}>Secrets Found:</Text>
          <Text style={styles.codeText}>{JSON.stringify(debugRun.expectedResult.secretsFound)}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>MATCHED RULES & NARRATIVE EFFECTS</Text>
          <Text style={styles.subHeader}>Matched Rule IDs:</Text>
          <Text style={styles.codeText}>{JSON.stringify(debugRun.matchedRuleIds)}</Text>
          <Text style={styles.subHeader}>Generated Story Effects:</Text>
          <Text style={styles.codeText}>{JSON.stringify(debugRun.generatedEffects, null, 2)}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 10, 20, 0.95)",
    borderWidth: 1,
    borderColor: colors.cyan,
    borderRadius: 8,
    padding: 12,
    margin: 8,
    maxHeight: 500
  },
  header: {
    marginBottom: 8,
    position: "relative"
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  badgeText: {
    backgroundColor: colors.pink,
    color: colors.white,
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 8,
    fontFamily: "monospace"
  },
  headerTitle: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  encounterSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 2
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 4
  },
  closeButtonText: {
    color: colors.pink,
    fontSize: 16,
    fontWeight: "bold"
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 8
  },
  controlBtn: {
    backgroundColor: colors.cyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4
  },
  controlBtnText: {
    color: colors.backgroundDark,
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  speedRow: {
    flexDirection: "row",
    marginLeft: "auto"
  },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    marginLeft: 4
  },
  speedBtnActive: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyan
  },
  speedBtnText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: "monospace"
  },
  speedBtnTextActive: {
    color: colors.backgroundDark,
    fontWeight: "bold"
  },
  progressContainer: {
    marginBottom: 8
  },
  progressText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: "monospace",
    marginBottom: 4
  },
  highlightText: {
    color: colors.cyan,
    fontWeight: "bold"
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.cyan
  },
  inspectorScroll: {
    maxHeight: 280
  },
  sectionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 8,
    borderRadius: 4,
    marginBottom: 8
  },
  sectionHeader: {
    color: colors.pink,
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 4
  },
  subHeader: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginTop: 6,
    marginBottom: 2
  },
  infoText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: "monospace"
  },
  codeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: "monospace"
  }
});
