import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import { TouchHoldButton } from "./controls/TouchHoldButton";
import { TouchInputState } from "@tiny-aster/core";

interface PongControlsProps {
  onP1Up: (pressed: boolean) => void;
  onP1Down: (pressed: boolean) => void;
  onP2Up: (pressed: boolean) => void;
  onP2Down: (pressed: boolean) => void;
  showP2Controls?: boolean;
  touchState?: TouchInputState;
}

export const PongControls: React.FC<PongControlsProps> = ({
  onP1Up,
  onP1Down,
  onP2Up,
  onP2Down,
  showP2Controls = false,
  touchState,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.side} pointerEvents="box-none">
        <TouchHoldButton
          buttonName="p1Up"
          label="▲"
          size={80}
          color="rgba(255, 255, 255, 0.2)"
          borderColor="white"
          pressedColor="rgba(255, 255, 255, 0.55)"
          textColor="white"
          touchState={touchState}
          onPressIn={() => onP1Up(true)}
          onPressOut={() => onP1Up(false)}
        />
        <View style={styles.spacer} />
        <TouchHoldButton
          buttonName="p1Down"
          label="▼"
          size={80}
          color="rgba(255, 255, 255, 0.2)"
          borderColor="white"
          pressedColor="rgba(255, 255, 255, 0.55)"
          textColor="white"
          touchState={touchState}
          onPressIn={() => onP1Down(true)}
          onPressOut={() => onP1Down(false)}
        />
      </View>

      {showP2Controls && (
        <View style={styles.side} pointerEvents="box-none">
          <TouchHoldButton
            buttonName="p2Up"
            label="▲"
            size={80}
            color="rgba(255, 255, 255, 0.2)"
            borderColor="white"
            pressedColor="rgba(255, 255, 255, 0.55)"
            textColor="white"
            touchState={touchState}
            onPressIn={() => onP2Up(true)}
            onPressOut={() => onP2Up(false)}
          />
          <View style={styles.spacer} />
          <TouchHoldButton
            buttonName="p2Down"
            label="▼"
            size={80}
            color="rgba(255, 255, 255, 0.2)"
            borderColor="white"
            pressedColor="rgba(255, 255, 255, 0.55)"
            textColor="white"
            touchState={touchState}
            onPressIn={() => onP2Down(true)}
            onPressOut={() => onP2Down(false)}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 40,
  },
  side: {
    justifyContent: "flex-end",
  },
  spacer: {
    height: 20,
  },
});
