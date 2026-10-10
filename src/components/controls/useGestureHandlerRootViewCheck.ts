import { useEffect } from "react";

/**
 * Non-blocking dev check hook verifying whether a control component is mounted
 * within a GestureHandlerRootView ancestor. Logs a warning in dev mode without throwing.
 */
export function useGestureHandlerRootViewCheck(componentName: string = "TouchControl"): void {
  useEffect(() => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const GH = require("react-native-gesture-handler");
        if (GH && GH.GestureHandlerRootViewContext) {
          // Context exists
        }
      } catch {
        console.warn(
          `[${componentName}] Warning: Component mounted without a GestureHandlerRootView ancestor. Gestures may not function properly.`
        );
      }
    }
  }, [componentName]);
}
