import { FC } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { ParallaxSkyBackground } from "./ParallaxSkyBackground";

export const RadialBackground: FC = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ParallaxSkyBackground theme="space" />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="screenVignette" cx="50%" cy="50%" r="80%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#101022" stopOpacity="0.4" />
            <Stop offset="45%" stopColor="#080814" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#000004" stopOpacity="0.9" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#screenVignette)" />
      </Svg>
    </View>
  );
};
