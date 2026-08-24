import React from "react";
import { GameUI, GameUIProps, GameUITheme } from "../../components/GameUI";

export const NEON_VOID_THEME: GameUITheme = {
  title: "NEON VOID",
  subTitle: "INTERCEPTOR // TELEMETRY",
  sectorLabel: "CONTAINMENT",
  scoreLabel: "DISTANCE",
  colors: {
    system: "#00F3FF",
    warning: "#FFC000",
    danger: "#FF0000",
    panel: "rgba(5, 5, 16, 0.85)",
    border: "rgba(0, 243, 255, 0.35)",
  },
};

export const FlappyBirdUI: React.FC<GameUIProps> = (props) => {
  return <GameUI {...props} theme={props.theme ?? NEON_VOID_THEME} />;
};
