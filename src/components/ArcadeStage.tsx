import React, { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { ArcadeGameAdapter, MiniGameResult, MiniGameRunContext } from "@tiny-aster/core";
import { colors } from "../theme/colors";

export interface ArcadeStageProps {
  run: MiniGameRunContext;
  adapter: ArcadeGameAdapter;
  onComplete: (result: MiniGameResult) => void;
  onError?: (error: Error) => void;
  onAbort?: (reason?: string) => void;
}

/**
 * Story Runtime agnostic React component hosting an ArcadeGameAdapter session.
 *
 * @remarks
 * Decoupled from StoryRuntime. Provides DOM host, manages lifecycle of ArcadeGameAdapter,
 * displays loading & error states, handles cleanup on unmount, and suppresses callbacks
 * post cleanup.
 */
export const ArcadeStage: React.FC<ArcadeStageProps> = ({
  run,
  adapter,
  onComplete,
  onError,
  onAbort
}) => {
  const containerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    let isCleanedUp = false;

    const initStage = async () => {
      setLoading(true);
      setErrorState(null);

      try {
        adapter.onResult((result: MiniGameResult) => {
          if (!isMountedRef.current || isCleanedUp) return;
          onComplete(result);
        });

        const hostElement = containerRef.current as unknown as HTMLElement;
        await adapter.initialize(run, hostElement);

        if (isMountedRef.current && !isCleanedUp) {
          setLoading(false);
        }
      } catch (err: any) {
        if (!isMountedRef.current || isCleanedUp) return;
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setErrorState(errorObj.message);
        setLoading(false);
        if (onError) {
          onError(errorObj);
        }
      }
    };

    initStage();

    return () => {
      isCleanedUp = true;
      isMountedRef.current = false;
      try {
        adapter.dispose();
      } catch {
        // Safe disposal fallback
      }
    };
  }, [run.runId, adapter]);

  return (
    <View style={styles.container}>
      {/* Container host for game canvas / DOM */}
      <View ref={containerRef} style={styles.stageHost} />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingText}>LOADING MINIGAME...</Text>
        </View>
      )}

      {/* Error Overlay */}
      {errorState && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>INITIALIZATION ERROR</Text>
          <Text style={styles.errorMessage}>{errorState}</Text>
          {onAbort && (
            <TouchableOpacity
              style={styles.abortButton}
              onPress={() => onAbort("stage_error")}
            >
              <Text style={styles.abortButtonText}>RETURN TO STORY</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    backgroundColor: colors.backgroundDark,
    overflow: "hidden"
  },
  stageHost: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent"
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 20, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    padding: 20
  },
  loadingText: {
    color: colors.cyan,
    fontSize: 16,
    fontFamily: "monospace",
    marginTop: 12,
    letterSpacing: 2
  },
  errorTitle: {
    color: colors.pink,
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 8
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: "monospace",
    textAlign: "center",
    marginBottom: 20
  },
  abortButton: {
    backgroundColor: colors.pink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4
  },
  abortButtonText: {
    color: colors.white,
    fontWeight: "bold",
    fontFamily: "monospace"
  }
});
