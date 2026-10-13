import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS
} from "react-native-reanimated";
import { resolveCutsceneTransitionProfile } from "./CutsceneTransitionMap";
import { useGameTheme } from "../../context/GameThemeContext";

/**
 * Props for the CutsceneTransitionOverlay component.
 * @public
 */
export interface CutsceneTransitionOverlayProps {
  /** Optional transition effect string key or class name. */
  effectName?: string;
  /** Callback fired once transition animation completes. */
  onComplete?: () => void;
  /** Custom duration override in milliseconds (default: profile duration <= 600ms). */
  durationMs?: number;
  /** Nested dialogue box or narrative content rendered following transition overlay. */
  children?: React.ReactNode;
}

/**
 * Cutscene transition presentation overlay driven by Reanimated.
 *
 * @remarks
 * Adapts transition names from TransitionRegistry into smooth visual animations
 * for narrative cutscenes in CampaignScreen across Native and Web platforms.
 *
 * @public
 */
export const CutsceneTransitionOverlay: React.FC<CutsceneTransitionOverlayProps> = ({
  effectName,
  onComplete,
  durationMs: overrideDuration,
  children
}) => {
  const { reduceMotion } = useGameTheme();
  const profile = resolveCutsceneTransitionProfile(effectName);
  const targetDuration = reduceMotion ? 0 : (overrideDuration ?? profile.durationMs);

  const opacity = useSharedValue(1);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || targetDuration <= 0) {
      opacity.value = 0;
      progress.value = 1;
      if (onComplete) {
        onComplete();
      }
      return;
    }

    // Play transition animation sequence
    progress.value = withTiming(
      1,
      { duration: targetDuration },
      (finished) => {
        if (finished) {
          opacity.value = withTiming(0, { duration: 150 }, (fadeFinished) => {
            if (fadeFinished && onComplete) {
              runOnJS(onComplete)();
            }
          });
        }
      }
    );
  }, [effectName, reduceMotion, targetDuration, opacity, progress, onComplete]);

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value
    };
  });

  const presetAnimatedStyle = useAnimatedStyle(() => {
    if (profile.preset === "crt" || profile.preset === "danger") {
      const scaleVal = 1 + (1 - progress.value) * 0.1;
      return {
        transform: [{ scale: scaleVal }]
      };
    }
    if (profile.preset === "curtain" || profile.preset === "sweep") {
      return {
        transform: [{ translateY: (1 - progress.value) * -40 }]
      };
    }
    if (profile.preset === "iris") {
      const scaleVal = Math.max(0.01, progress.value);
      return {
        transform: [{ scale: scaleVal }]
      };
    }
    return {};
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.overlayBase,
          { backgroundColor: profile.primaryColor },
          overlayAnimatedStyle,
          presetAnimatedStyle
        ]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative"
  },
  overlayBase: {
    zIndex: 100,
    borderRadius: 8
  }
});
