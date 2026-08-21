import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Easing, Dimensions } from "react-native";
import { COLORS } from "../theme";

interface ParallaxSkyBackgroundProps {
  theme?: "space" | "cyber" | "default";
  primaryColor?: string;
  secondaryColor?: string;
  children?: React.ReactNode;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const ParallaxSkyBackground: React.FC<ParallaxSkyBackgroundProps> = ({
  theme = "space",
  primaryColor = COLORS.neonCyan,
  secondaryColor = "#0a0e27",
  children,
}) => {
  const animVal1 = useRef(new Animated.Value(0)).current;
  const animVal2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.timing(animVal1, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const loop2 = Animated.loop(
      Animated.timing(animVal2, {
        toValue: 1,
        duration: 35000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop1.start();
    loop2.start();

    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [animVal1, animVal2]);

  const translateY1 = animVal1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_HEIGHT],
  });

  const translateY2 = animVal2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_HEIGHT],
  });

  return (
    <View style={styles.container}>
      {/* Base Gradient Background */}
      <View style={[styles.gradientBg, { backgroundColor: secondaryColor }]} />

      {/* Radial Glow Overlay */}
      <View
        style={[
          styles.radialGlow,
          {
            backgroundColor: primaryColor,
            opacity: theme === "space" ? 0.08 : 0.12,
          },
        ]}
      />

      {/* Parallax Star Layer 1 */}
      <Animated.View
        style={[
          styles.starLayer,
          {
            transform: [{ translateY: translateY1 }],
          },
        ]}
      >
        <View style={[styles.star, { top: "10%", left: "15%", backgroundColor: primaryColor }]} />
        <View style={[styles.star, { top: "30%", left: "75%", backgroundColor: "#ffffff" }]} />
        <View style={[styles.star, { top: "55%", left: "25%", backgroundColor: primaryColor }]} />
        <View style={[styles.star, { top: "80%", left: "85%", backgroundColor: "#ffffff" }]} />
      </Animated.View>

      {/* Parallax Star Layer 2 (Duplicate for seamless loop) */}
      <Animated.View
        style={[
          styles.starLayer,
          {
            top: -SCREEN_HEIGHT,
            transform: [{ translateY: translateY1 }],
          },
        ]}
      >
        <View style={[styles.star, { top: "10%", left: "15%", backgroundColor: primaryColor }]} />
        <View style={[styles.star, { top: "30%", left: "75%", backgroundColor: "#ffffff" }]} />
        <View style={[styles.star, { top: "55%", left: "25%", backgroundColor: primaryColor }]} />
        <View style={[styles.star, { top: "80%", left: "85%", backgroundColor: "#ffffff" }]} />
      </Animated.View>

      {/* Parallax Star Layer Slow */}
      <Animated.View
        style={[
          styles.starLayer,
          {
            transform: [{ translateY: translateY2 }],
          },
        ]}
      >
        <View style={[styles.starLarge, { top: "20%", left: "50%", backgroundColor: primaryColor }]} />
        <View style={[styles.starLarge, { top: "65%", left: "10%", backgroundColor: "#ffffff" }]} />
      </Animated.View>

      {/* Grid line texture overlay */}
      <View style={styles.gridOverlay} />

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  radialGlow: {
    position: "absolute",
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: SCREEN_WIDTH * 0.75,
    top: -SCREEN_WIDTH * 0.4,
    left: -SCREEN_WIDTH * 0.25,
  },
  starLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 1,
    opacity: 0.7,
  },
  starLarge: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.9,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderWidth: 0,
    opacity: 0.05,
  },
});
