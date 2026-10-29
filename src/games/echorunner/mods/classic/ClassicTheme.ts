import type { EchoRunnerThemeModule } from "../types";
import { DEFAULT_ECHO_PALETTE } from "../../../shared/rendering/PlatformerSharedVisualUtils";

/** Default Echo Runner aesthetic (shared palette defaults, local registry). */
export const classicTheme: EchoRunnerThemeModule = {
  id: "classic",
  displayName: "Archive Classic",
  tokens: DEFAULT_ECHO_PALETTE
};
