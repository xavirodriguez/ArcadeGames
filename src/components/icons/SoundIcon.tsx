import React from "react";
import Svg, { Path } from "react-native-svg";
import { COLORS } from "@/theme";

interface IconProps {
  size?: number;
  color?: string;
  muted?: boolean;
}

export const SoundIcon: React.FC<IconProps> = ({
  size = 24,
  color = COLORS.info,
  muted = false,
}) => {
  if (muted) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M11 5L6 9H2V15H6L11 19V5Z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M23 9L17 15M17 9L23 15"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5L6 9H2V15H6L11 19V5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15.54 8.46A5 5 0 0115.54 15.54M19.07 4.93A10 10 0 0119.07 19.07"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const MuteIcon: React.FC<IconProps> = (props) => (
  <SoundIcon {...props} muted={true} />
);
