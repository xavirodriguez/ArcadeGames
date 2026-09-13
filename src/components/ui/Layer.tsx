import React from "react";
import { View, ViewProps } from "react-native";
import { LAYER_ELEVATION, LayerElevationLevel } from "@/theme/layers";

export interface LayerProps extends ViewProps {
  level: LayerElevationLevel;
  children?: React.ReactNode;
}

/**
 * <Layer> component applies standardized Z_INDEX elevation layers across arcade screens.
 */
export const Layer: React.FC<LayerProps> = ({ level, style, children, ...props }) => {
  const zIndexValue = typeof level === "number" ? level : LAYER_ELEVATION[level] ?? LAYER_ELEVATION.CANVAS;

  return (
    <View style={[{ zIndex: zIndexValue }, style]} {...props}>
      {children}
    </View>
  );
};
