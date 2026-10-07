import React, { createContext, useContext, useEffect, useRef } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { TouchInputState } from "@tiny-aster/core";

const TouchInputContext = createContext<TouchInputState | null>(null);

/**
 * Custom hook to retrieve the current TouchInputState instance from context.
 */
export function useTouchInputState(): TouchInputState | null {
  return useContext(TouchInputContext);
}

export interface TouchInputProviderProps {
  touchState?: TouchInputState;
  style?: ViewStyle;
  children: React.ReactNode;
}

/**
 * Provider wrapping touch control zones.
 * Includes a non-blocking DEV check for GestureHandlerRootView ancestor.
 */
export const TouchInputProvider: React.FC<TouchInputProviderProps> = ({
  touchState,
  style,
  children,
}) => {
  const defaultStateRef = useRef<TouchInputState | null>(null);
  if (!touchState && !defaultStateRef.current) {
    defaultStateRef.current = new TouchInputState();
  }

  const activeState = touchState || defaultStateRef.current!;

  useEffect(() => {
    if (__DEV__) {
      // Non-blocking diagnostic check for GestureHandlerRootView
      try {
        const gh = require("react-native-gesture-handler");
        if (gh && typeof gh.GestureHandlerRootView !== "function") {
          console.warn(
            "[TouchInputProvider] Warning: Touch control components should be wrapped inside a GestureHandlerRootView ancestor."
          );
        }
      } catch (_e) {
        // Ignore if module resolution is environment specific
      }
    }
  }, []);

  return (
    <TouchInputContext.Provider value={activeState}>
      <View style={[styles.container, style]} pointerEvents="box-none">
        {children}
      </View>
    </TouchInputContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
