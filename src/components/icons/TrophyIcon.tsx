import React from "react";
import Svg, { Path } from "react-native-svg";
import { COLORS } from "@/theme";

interface IconProps {
  size?: number;
  color?: string;
}

export const TrophyIcon: React.FC<IconProps> = ({
  size = 24,
  color = COLORS.warning,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 21H16M12 17V21M6 4H18V9C18 12.3137 15.3137 15 12 15C8.68629 15 6 12.3137 6 9V4Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 6H3V8C3 9.65685 4.34315 11 6 11V6ZM18 6H21V8C21 9.65685 19.6569 11 18 11V6Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
