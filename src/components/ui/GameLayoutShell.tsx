import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { Layer } from "./Layer";

export interface GameLayoutShellProps {
  /** Top left slot (e.g., BackButton or lives counter) */
  topLeftSlot?: React.ReactNode;
  /** Top right slot (e.g., Pause button) */
  topRightSlot?: React.ReactNode;
  /** Center HUD slot (e.g., Score, High Score, Combo) */
  centerHudSlot?: React.ReactNode;
  /** Complete custom HUD slot (e.g., GameUI or SpaceInvadersUI) */
  hudSlot?: React.ReactNode;
  /** Main canvas rendering area (CanvasRenderer) */
  canvasSlot?: React.ReactNode;
  /** In-game touch controls layer (VirtualJoystick, action buttons) */
  controlsSlot?: React.ReactNode;
  /** Overlay layer (Pause overlay, Game Over, Daily Results, Comms) */
  overlaySlot?: React.ReactNode;
  /** Engine debug overlay slot */
  debugSlot?: React.ReactNode;
  /** Optional background element (e.g. RadialBackground) */
  backgroundSlot?: React.ReactNode;
  /** Style override for the root container */
  style?: StyleProp<ViewStyle>;
}

/**
 * GameLayoutShell unifies HUD slots, controls, canvas, and overlays across arcade screens
 * while enforcing declarative layer ordering through <Layer level={...}>.
 */
export const GameLayoutShell: React.FC<GameLayoutShellProps> = ({
  topLeftSlot,
  topRightSlot,
  centerHudSlot,
  hudSlot,
  canvasSlot,
  controlsSlot,
  overlaySlot,
  debugSlot,
  backgroundSlot,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {backgroundSlot}

      {/* Canvas rendering layer */}
      {canvasSlot && (
        <Layer level="CANVAS" style={styles.layerFill} pointerEvents="auto">
          {canvasSlot}
        </Layer>
      )}

      {/* Custom HUD Surface */}
      {hudSlot && (
        <Layer level="HUD_SURFACE" style={styles.hudSurfaceLayer} pointerEvents="box-none">
          {hudSlot}
        </Layer>
      )}

      {/* Standard top slots (top-left, top-right, top-center) */}
      {(topLeftSlot || topRightSlot || centerHudSlot) && (
        <Layer level="HUD_INTERACTIVES" style={styles.headerSlotsLayer} pointerEvents="box-none">
          <View style={styles.topLeftSlotContainer} pointerEvents="box-none">
            {topLeftSlot}
          </View>
          <View style={styles.centerSlotContainer} pointerEvents="none">
            {centerHudSlot}
          </View>
          <View style={styles.topRightSlotContainer} pointerEvents="box-none">
            {topRightSlot}
          </View>
        </Layer>
      )}

      {/* Touch controls layer */}
      {controlsSlot && (
        <Layer level="CONTROLS" style={styles.controlsLayer} pointerEvents="box-none">
          {controlsSlot}
        </Layer>
      )}

      {/* Overlays layer (Pause, Game Over, Modals) */}
      {overlaySlot && (
        <Layer level="MODAL_OVERLAY" style={styles.layerFill} pointerEvents="box-none">
          {overlaySlot}
        </Layer>
      )}

      {/* Debug Overlay layer */}
      {debugSlot && (
        <Layer level="DEBUG_OVERLAY" style={styles.layerFill} pointerEvents="box-none">
          {debugSlot}
        </Layer>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    width: "100%",
    height: "100%",
  },
  layerFill: {
    ...StyleSheet.absoluteFillObject,
  },
  hudSurfaceLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  headerSlotsLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  topLeftSlotContainer: {
    alignItems: "flex-start",
  },
  centerSlotContainer: {
    flex: 1,
    alignItems: "center",
  },
  topRightSlotContainer: {
    alignItems: "flex-end",
  },
  controlsLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
