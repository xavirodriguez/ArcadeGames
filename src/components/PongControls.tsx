import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import { TouchHoldButton } from "./controls/TouchHoldButton";

interface PongControlsProps {
  onP1Up: (pressed: boolean) => void;
  onP1Down: (pressed: boolean) => void;
  onP2Up: (pressed: boolean) => void;
  onP2Down: (pressed: boolean) => void;
  showP2Controls?: boolean;
}

export const PongControls: React.FC<PongControlsProps> = ({
  onP1Up,
  onP1Down,
  onP2Up,
  onP2Down,
  showP2Controls = false,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.side} pointerEvents="box-none">
        <TouchHoldButton
          label="▲"
          size={80}
          color="rgba(255, 255, 255, 0.2)"
          borderColor="white"
          pressedColor="rgba(255, 255, 255, 0.55)"
          textColor="white"
          onHoldStart={() => onP1Up(true)}
          onHoldEnd={() => onP1Up(false)}
          accessibilityLabel={t?.accessibility?.pong_p1_up || "Player 1 Move Up"}
          accessibilityHint={t?.accessibility?.pong_p1_up_hint || "Moves Player 1 paddle upwards"}
        />
        <View style={styles.spacer} />
        <TouchHoldButton
          label="▼"
          size={80}
          color="rgba(255, 255, 255, 0.2)"
          borderColor="white"
          pressedColor="rgba(255, 255, 255, 0.55)"
          textColor="white"
          onHoldStart={() => onP1Down(true)}
          onHoldEnd={() => onP1Down(false)}
          accessibilityLabel={t?.accessibility?.pong_p1_down || "Player 1 Move Down"}
          accessibilityHint={t?.accessibility?.pong_p1_down_hint || "Moves Player 1 paddle downwards"}
        />
      </View>

      {showP2Controls && (
        <View style={styles.side} pointerEvents="box-none">
          <TouchHoldButton
            label="▲"
            size={80}
            color="rgba(255, 255, 255, 0.2)"
            borderColor="white"
            pressedColor="rgba(255, 255, 255, 0.55)"
            textColor="white"
            onHoldStart={() => onP2Up(true)}
            onHoldEnd={() => onP2Up(false)}
            accessibilityLabel={t?.accessibility?.pong_p2_up || "Player 2 Move Up"}
            accessibilityHint={t?.accessibility?.pong_p2_up_hint || "Moves Player 2 paddle upwards"}
          />
          <View style={styles.spacer} />
          <TouchHoldButton
            label="▼"
            size={80}
            color="rgba(255, 255, 255, 0.2)"
            borderColor="white"
            pressedColor="rgba(255, 255, 255, 0.55)"
            textColor="white"
            onHoldStart={() => onP2Down(true)}
            onHoldEnd={() => onP2Down(false)}
            accessibilityLabel={t?.accessibility?.pong_p2_down || "Player 2 Move Down"}
            accessibilityHint={t?.accessibility?.pong_p2_down_hint || "Moves Player 2 paddle downwards"}
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
