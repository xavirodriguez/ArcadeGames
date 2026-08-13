import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RadialBackground } from "@/components/RadialBackground";
import { colors } from "@/theme";

interface GameScreenProps {
  children: React.ReactNode;
  showRadialBackground?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  children,
  showRadialBackground = true,
  style,
}) => {
  return (
    <SafeAreaProvider>
      <View style={[styles.container, style]}>
        {showRadialBackground && <RadialBackground />}
        {children}
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    position: "relative",
  },
});
