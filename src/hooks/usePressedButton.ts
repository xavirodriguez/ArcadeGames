import { useState, useCallback } from "react";
import { COLORS } from "../theme";

export function usePressedButton(primaryColor = COLORS.neonCyan) {
  const [isPressed, setIsPressed] = useState(false);

  const onPressIn = useCallback(() => {
    setIsPressed(true);
  }, []);

  const onPressOut = useCallback(() => {
    setIsPressed(false);
  }, []);

  return {
    isPressed,
    pressProps: {
      onPressIn,
      onPressOut,
    },
    pressedStyle: isPressed
      ? {
          borderColor: primaryColor,
          backgroundColor: `${primaryColor}33`,
          transform: [{ scale: 0.97 }],
        }
      : {},
  };
}
