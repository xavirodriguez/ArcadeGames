import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";
import { useTranslation } from "../../hooks/useTranslation";
import { VirtualJoystick } from "./VirtualJoystick";
import { ActionButton } from "./ActionButton";
import { hapticShoot, hapticHyperspace } from "../../utils/haptics";

export interface MobileInputAdapter {
  reset(): void;
  // Discrete Asteroids controls (optional)
  setRotateLeft?(pressed: boolean): void;
  setRotateRight?(pressed: boolean): void;
  setThrust?(pressed: boolean): void;
  setShoot?(pressed: boolean): void;
  setHyperspace?(pressed: boolean): void;

  // General continuous axes
  setMoveAxis?(x: number, y: number): void;
  setAimAxis?(x: number, y: number): void;

  // Additional action inputs
  setAction?(action: string, pressed: boolean): void;
}

export interface ActionButtonConfig {
  id: string;
  label: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  color?: string;
}

export interface MobileControlsOverlayProps {
  adapter: MobileInputAdapter;
  /**
   * Asteroids mapping:
   *   joystick x < -0.35 → rotateLeft
   *   joystick x >  0.35 → rotateRight
   *   joystick y < -0.25 → thrust
   */
  discreteMapping?: boolean;
  /**
   * Mode for joysticks:
   * "single-stick": Left joystick for movement/rotation.
   * "twin-stick": Left joystick for movement, right joystick for aim.
   */
  mode?: "single-stick" | "twin-stick";
  /**
   * Explicit deadZone for VirtualJoystick instances (defaults to 0.12).
   */
  deadZone?: number;
  /**
   * Optional custom action buttons for the right zone when in single-stick mode.
   */
  actionButtons?: ActionButtonConfig[];
}

const ROTATE_THRESHOLD = 0.35;
const THRUST_THRESHOLD = -0.25; // negative Y = up on screen

/**
 * Renders touch controls on top of the game canvas.
 * Only mounts on iOS/Android. Cleans up all overrides on unmount and AppState background.
 */
export function MobileControlsOverlay({
  adapter,
  discreteMapping = false,
  mode = "single-stick",
  deadZone = 0.12,
  actionButtons,
}: MobileControlsOverlayProps) {
  // Don't render on web
  if (Platform.OS === "web") return null;

  return (
    <MobileControlsOverlayInner
      adapter={adapter}
      discreteMapping={discreteMapping}
      mode={mode}
      deadZone={deadZone}
      actionButtons={actionButtons}
    />
  );
}

// Inner component so hooks are only called on native
function MobileControlsOverlayInner({
  adapter,
  discreteMapping,
  mode,
  deadZone,
  actionButtons,
}: MobileControlsOverlayProps) {
  const { t } = useTranslation();

  // Keep a stable ref to avoid stale closures in gesture callbacks
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  // Clean up all overrides on unmount or when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        adapterRef.current.reset();
      }
    });

    return () => {
      subscription.remove();
      adapterRef.current.reset();
    };
  }, []);

  const handleLeftJoystickMove = useCallback(
    (x: number, y: number) => {
      const a = adapterRef.current;
      if (discreteMapping) {
        a.setRotateLeft?.(x < -ROTATE_THRESHOLD);
        a.setRotateRight?.(x > ROTATE_THRESHOLD);
        a.setThrust?.(y < THRUST_THRESHOLD);
      } else {
        a.setMoveAxis?.(x, y);
      }
    },
    [discreteMapping]
  );

  const handleLeftJoystickRelease = useCallback(() => {
    const a = adapterRef.current;
    if (discreteMapping) {
      a.setRotateLeft?.(false);
      a.setRotateRight?.(false);
      a.setThrust?.(false);
    } else {
      a.setMoveAxis?.(0, 0);
    }
  }, [discreteMapping]);

  const handleRightJoystickMove = useCallback((x: number, y: number) => {
    const a = adapterRef.current;
    a.setAimAxis?.(x, y);
  }, []);

  const handleRightJoystickRelease = useCallback(() => {
    const a = adapterRef.current;
    a.setAimAxis?.(0, 0);
  }, []);

  const defaultActionButtons: ActionButtonConfig[] = [
    {
      id: "shoot",
      label: "🔥",
      accessibilityLabel: t?.accessibility?.shoot_button_label || "Fire weapon",
      accessibilityHint: t?.accessibility?.shoot_button_hint || "Fires primary weapon",
      color: "rgba(255,80,80,0.25)",
    },
    {
      id: "hyperspace",
      label: "⚡",
      accessibilityLabel: t?.accessibility?.hyperspace_button_label || "Hyperspace jump",
      accessibilityHint: t?.accessibility?.hyperspace_button_hint || "Teleports ship to a random location",
      color: "rgba(80,80,255,0.25)",
    },
  ];

  const buttonsToRender = actionButtons ?? defaultActionButtons;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Left zone — Movement joystick */}
      <View style={styles.leftZone} pointerEvents="box-none">
        <VirtualJoystick
          type="movement"
          deadZone={deadZone}
          onMove={handleLeftJoystickMove}
          onRelease={handleLeftJoystickRelease}
        />
      </View>

      {/* Right zone — Aim joystick or Action Buttons */}
      <View style={styles.rightZone} pointerEvents="box-none">
        {mode === "twin-stick" ? (
          <VirtualJoystick
            type="aim"
            deadZone={deadZone}
            onMove={handleRightJoystickMove}
            onRelease={handleRightJoystickRelease}
          />
        ) : (
          buttonsToRender.map((btn) => (
            <ActionButton
              key={btn.id}
              label={btn.label}
              accessibilityLabel={btn.accessibilityLabel}
              accessibilityHint={btn.accessibilityHint}
              onPressIn={() => {
                if (btn.id === "shoot") {
                  hapticShoot();
                  adapterRef.current.setShoot?.(true);
                } else if (btn.id === "hyperspace") {
                  hapticHyperspace();
                  adapterRef.current.setHyperspace?.(true);
                } else {
                  hapticShoot();
                  adapterRef.current.setAction?.(btn.id, true);
                }
              }}
              onPressOut={() => {
                if (btn.id === "shoot") adapterRef.current.setShoot?.(false);
                else if (btn.id === "hyperspace") adapterRef.current.setHyperspace?.(false);
                else adapterRef.current.setAction?.(btn.id, false);
              }}
              color={btn.color}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingBottom: 36,
  },
  leftZone: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  rightZone: {
    width: 160,
    height: 160,
    gap: 16,
    alignItems: "center",
    justifyContent: "flex-end",
    flexDirection: "column",
    paddingBottom: 8,
  },
});
