import { useEffect, useRef, RefObject } from "react";
import { Platform } from "react-native";

interface UseGameWheelOptions {
  /**
   * Callback invoked when a wheel event occurs.
   * Receives the original WheelEvent to read coordinates or delta values.
   */
  onWheel?: (event: WheelEvent) => void;
  /**
   * Determines if the scroll-blocking wheel listener should be active.
   * Useful to only register listeners during active gameplay and avoid global pollution.
   * Defaults to true.
   */
  enabled?: boolean;
}

/**
 * Custom React hook that registers a non-passive, scroll-blocking 'wheel' event listener
 * on a specific DOM element (such as a <canvas> ref) rather than the global window or document.
 *
 * This provides a high-performance, scoped approach to handling game wheel mechanics and
 * preventing unwanted page scrolling on modern browsers, while avoiding the global [Violation]
 * warnings and maintaining robust lifecycle management.
 *
 * @param elementRef - React ref pointing to the HTML element (e.g. HTMLCanvasElement).
 * @param options - Configuration options containing the callback and enabled state.
 */
export function useGameWheel(
  elementRef: RefObject<HTMLElement | null>,
  options: UseGameWheelOptions = {}
): void {
  const { onWheel, enabled = true } = options;

  // Store the onWheel callback in a mutable ref to prevent listener tear-down and re-registration
  // when an anonymous inline function is passed as a prop from parent components.
  const onWheelRef = useRef(onWheel);
  useEffect(() => {
    onWheelRef.current = onWheel;
  }, [onWheel]);

  useEffect(() => {
    // Symmetrical validation: Only apply to Web platform and when enabled
    if (Platform.OS !== "web" || !enabled) return;

    const element = elementRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      // 1. Immediately prevent default browser scrolling behavior (requires passive: false)
      event.preventDefault();

      // 2. Invoke the callback for custom gameplay logic (zoom, weapon switch, etc.)
      const callback = onWheelRef.current;
      if (callback) {
        callback(event);
      }
    };

    // 3. Register the event listener with 'passive: false' explicitly.
    // This localized subscription on a specific element avoids global compositor blocking on window/document.
    element.addEventListener("wheel", handleWheel, { passive: false });

    // 4. Symmetrical cleanup: Symmetrically remove the exact listener on unmount/re-evaluation
    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [elementRef, enabled]);
}
