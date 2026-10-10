import React, { useEffect, useContext } from "react";

export const GestureHandlerRootViewCheckContext = React.createContext<boolean>(false);

let RNGHRootContext: React.Context<boolean> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const req = require("react-native-gesture-handler/lib/commonjs/GestureHandlerRootViewContext");
  RNGHRootContext = req?.default ?? req;
} catch {
  RNGHRootContext = null;
}

/**
 * Non-blocking development check hook verifying whether touch control components
 * are mounted within an ancestor GestureHandlerRootView.
 * Logs a warning in __DEV__ if missing without throwing an error.
 */
export function useGestureHandlerRootViewCheck(): void {
  const isInsideRNGH = RNGHRootContext ? useContext(RNGHRootContext) : false;
  const isInsideCustom = useContext(GestureHandlerRootViewCheckContext);
  const isInsideRoot = Boolean(isInsideRNGH || isInsideCustom);

  useEffect(() => {
    const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";
    if (isDev && !isInsideRoot) {
      console.warn(
        "[TouchControls] Control component was mounted without a GestureHandlerRootView ancestor. " +
          "Ensure GestureHandlerRootView wraps your root layout to avoid touch gesture drops."
      );
    }
  }, [isInsideRoot]);
}
