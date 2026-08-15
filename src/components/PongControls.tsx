import React from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import { hapticSelection } from "../utils/haptics";

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

  const handlePressIn = (action: () => void) => {
    hapticSelection();
    action();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.side} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t?.accessibility?.pong_p1_up || "Player 1 Move Up"}
          accessibilityHint={t?.accessibility?.pong_p1_up_hint || "Moves Player 1 paddle upwards"}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPressIn={() => handlePressIn(() => onP1Up(true))}
          onPressOut={() => onP1Up(false)}
        >
          <Text style={styles.text}>▲</Text>
        </Pressable>
        <View style={{ height: 20 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t?.accessibility?.pong_p1_down || "Player 1 Move Down"}
          accessibilityHint={t?.accessibility?.pong_p1_down_hint || "Moves Player 1 paddle downwards"}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPressIn={() => handlePressIn(() => onP1Down(true))}
          onPressOut={() => onP1Down(false)}
        >
          <Text style={styles.text}>▼</Text>
        </Pressable>
      </View>

      {showP2Controls && (
        <View style={styles.side} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t?.accessibility?.pong_p2_up || "Player 2 Move Up"}
            accessibilityHint={t?.accessibility?.pong_p2_up_hint || "Moves Player 2 paddle upwards"}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPressIn={() => handlePressIn(() => onP2Up(true))}
            onPressOut={() => onP2Up(false)}
          >
            <Text style={styles.text}>▲</Text>
          </Pressable>
          <View style={{ height: 20 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t?.accessibility?.pong_p2_down || "Player 2 Move Down"}
            accessibilityHint={t?.accessibility?.pong_p2_down_hint || "Moves Player 2 paddle downwards"}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPressIn={() => handlePressIn(() => onP2Down(true))}
            onPressOut={() => onP2Down(false)}
          >
            <Text style={styles.text}>▼</Text>
          </Pressable>
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
  button: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  pressed: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  text: {
    color: "white",
    fontSize: 32,
  },
  spacerVertical20: {
    height: 20,
  },
});
