import React from "react";
import Svg, { Path } from "react-native-svg";
import { COLORS } from "@/theme";

interface IconProps {
  size?: number;
  color?: string;
}

export const MenuIcon: React.FC<IconProps> = ({
  size = 24,
  color = COLORS.info,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6H20M4 12H20M4 18H20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
