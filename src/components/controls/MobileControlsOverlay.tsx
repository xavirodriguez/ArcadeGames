import { useCallback, useEffect, useRef } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../../hooks/useTranslation";
import { TouchVirtualJoystick } from "./TouchVirtualJoystick";
import { TouchActionButton } from "./TouchActionButton";

export const DEFAULT_ROTATE_THRESHOLD = 0.25;
export const DEFAULT_THRUST_THRESHOLD = -0.25; // negative Y = up on screen
export const DEFAULT_AIM_FIRE_THRESHOLD = 0.2;

export interface MobileInputAdapter {
  reset(): void;
  setRotateLeft(pressed: boolean): void;
  setRotateRight(pressed: boolean): void;
  setThrust(pressed: boolean): void;
  setMoveAxis(x: number, y: number): void;
  setShoot(pressed: boolean): void;
  setHyperspace(pressed: boolean): void;
}

export interface MobileControlsOverlayProps {
  adapter: MobileInputAdapter;
  /**
   * Asteroids mapping:
   *   joystick x < -0.35 → rotateLeft
   *   joystick x >  0.35 → rotateRight
   *   joystick y < -0.25 → thrust
   *
   * Set to false to use raw axis mode (adapter.setMoveAxis).
   */
  discreteMapping?: boolean;
  floatingJoystick?: boolean;
}

/**
 * Renders touch controls on top of the game canvas.
 * Only mounts on iOS/Android. Cleans up all overrides on unmount.
 *
 * Design Decision:
 * Left zone uses TouchVirtualJoystick for direction / rotation / thrust.
 * Right zone uses individual TouchActionButton components with pointerEvents="box-none" on parent View,
 * enabling simultaneous multi-touch interactions without requiring explicit Gesture.Simultaneous composition across distinct spatial regions.
 */
export function MobileControlsOverlay({
  adapter,
  discreteMapping = true,
  floatingJoystick = true,
}: MobileControlsOverlayProps) {
  // Don't render on web
  if (Platform.OS === "web") return null;

  return (
    <MobileControlsOverlayInner
      adapter={adapter}
      discreteMapping={discreteMapping}
      floatingJoystick={floatingJoystick}
    />
  );
}

function MobileControlsOverlayInner({
  adapter,
  discreteMapping,
  floatingJoystick = true,
}: MobileControlsOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;

  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  useEffect(() => {
    return () => {
      adapterRef.current.reset();
    };
  }, []);

  const handleJoystickMove = useCallback(
    (x: number, y: number) => {
      const a = adapterRef.current;
      if (discreteMapping) {
        a.setRotateLeft(x < -DEFAULT_ROTATE_THRESHOLD);
        a.setRotateRight(x > DEFAULT_ROTATE_THRESHOLD);
        a.setThrust(y < DEFAULT_THRUST_THRESHOLD);
      } else {
        a.setMoveAxis(x, y);
      }
    },
    [discreteMapping]
  );

  const handleJoystickRelease = useCallback(() => {
    const a = adapterRef.current;
    if (discreteMapping) {
      a.setRotateLeft(false);
      a.setRotateRight(false);
      a.setThrust(false);
    } else {
      a.setMoveAxis(0, 0);
    }
  }, [discreteMapping]);

  const { t } = useTranslation();
  const zoneSize = isTablet ? 200 : 160;

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingBottom: Math.max(36, insets.bottom + 12),
          paddingLeft: Math.max(24, insets.left + 16),
          paddingRight: Math.max(24, insets.right + 16),
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Left zone — joystick */}
      <View style={[styles.leftZone, { width: zoneSize, height: zoneSize }]}>
        <TouchVirtualJoystick
          floating={floatingJoystick}
          onMove={handleJoystickMove}
          onRelease={handleJoystickRelease}
          accessibilityLabel="Movement Joystick"
        />
      </View>

      {/* Right zone — action buttons */}
      <View style={styles.rightZone}>
        <TouchActionButton
          label="🔥"
          accessibilityLabel={t?.accessibility?.shoot_button_label || "Fire weapon"}
          accessibilityHint={t?.accessibility?.shoot_button_hint || "Fires primary weapon"}
          onPressIn={() => adapterRef.current.setShoot(true)}
          onPressOut={() => adapterRef.current.setShoot(false)}
          color="rgba(255,80,80,0.25)"
        />
        <TouchActionButton
          label="⚡"
          accessibilityLabel={t?.accessibility?.hyperspace_button_label || "Hyperspace jump"}
          accessibilityHint={t?.accessibility?.hyperspace_button_hint || "Teleports ship to a random location"}
          onPressIn={() => adapterRef.current.setHyperspace(true)}
          onPressOut={() => adapterRef.current.setHyperspace(false)}
          color="rgba(80,80,255,0.25)"
        />
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
    gap: 20,
    alignItems: "center",
    justifyContent: "flex-end",
    flexDirection: "column",
    paddingBottom: 8,
  },
});
