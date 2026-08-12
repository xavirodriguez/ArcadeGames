import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  BounceIn,
  FadeIn,
  FadeOut,
  SlideInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

/**
 * Second visual pass for the ODISEA-7 HUD.
 *
 * Changes in this version:
 * 1. Modular spacecraft-style HUD instead of a single text row.
 * 2. Custom life/ship iconography and a stronger display/data type system.
 * 3. Diegetic READY and GAME OVER overlays tied to the ODISEA-7 universe.
 * 4. Semantic color roles: system / warning / success / danger.
 * 5. Reusable technical graphic language: module codes, rails, corner marks.
 * 6. More cinematic READY and INTERMISSION compositions with per-tick motion.
 */

const COLORS = {
  // Semantic roles. Prefer these aliases in UI decisions.
  system: "#00E8D2",
  warning: "#F6C85F",
  success: "#67F7A7",
  danger: "#FF315B",

  // Base palette kept for backwards readability inside the style sheet.
  cyan: "#00E8D2",
  cyanFaint: "rgba(0, 232, 210, 0.08)",
  white: "#F3F7F6",
  whiteMuted: "rgba(243, 247, 246, 0.62)",
  amber: "#F6C85F",
  green: "#67F7A7",
  red: "#FF315B",
  ink: "#06100F",
  panel: "rgba(3, 16, 15, 0.76)",
  panelStrong: "rgba(2, 10, 10, 0.92)",
  border: "rgba(0, 232, 210, 0.32)",
};

// Uses platform fonts only, so this file does not add a font dependency.
// These can later be replaced with the final brand fonts in one place.
const DISPLAY_FONT = Platform.select({
  ios: "AvenirNextCondensed-Bold",
  android: "sans-serif-condensed",
  web: "Arial Narrow",
  default: "System",
});

const DATA_FONT = Platform.select({
  ios: "Menlo-Bold",
  android: "monospace",
  web: "Courier New",
  default: "monospace",
});

type SkiaModuleType = typeof import("@shopify/react-native-skia");

interface CanvasProps {
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
  children?: React.ReactNode;
}

interface BackdropBlurProps {
  blur: number;
  clip?: { x: number; y: number; width: number; height: number };
  children?: React.ReactNode;
}

interface FillProps {
  color: string;
}

type CanvasComponent = React.ComponentType<CanvasProps>;
type BackdropBlurComponent = React.ComponentType<BackdropBlurProps>;
type FillComponent = React.ComponentType<FillProps>;

let Canvas: CanvasComponent | null = null;
let BackdropBlur: BackdropBlurComponent | null = null;
let Fill: FillComponent | null = null;

if (Platform.OS !== "web") {
  try {
    const SkiaModule = require("@shopify/react-native-skia") as SkiaModuleType;
    Canvas = SkiaModule.Canvas as unknown as CanvasComponent;
    BackdropBlur = SkiaModule.BackdropBlur as unknown as BackdropBlurComponent;
    Fill = SkiaModule.Fill as unknown as FillComponent;
  } catch (_err) {
    // Skia is optional. The UI still works without it.
  }
}

interface MinimalGameState {
  score: number;
  lives?: number;
  level?: number;
  isGameOver: boolean;
  readyRemaining?: number;
  intermissionRemaining?: number;
  continueCountdownRemaining?: number;
  continuesRemaining?: number;
  mode?: "deathmatch" | "story";
  storyBeatText?: string;
  chapterTitle?: string;
  [key: string]: any;
}

interface GameUIProps {
  gameState: MinimalGameState;
  onRestart?: () => void;
  onPause?: () => void;
  isPaused?: boolean;
  highScore?: number;
  seed?: number;
  onSetSeed?: (seed?: number) => void;
  onContinue?: () => void;
}

const formatScore = (score: number) => String(Math.max(0, score)).padStart(8, "0");
const formatLevel = (level: number) => String(Math.max(1, level)).padStart(2, "0");

export const GameUI = React.memo(function GameUI({
  gameState,
  onRestart,
  onPause,
  isPaused,
  highScore,
  onContinue,
}: GameUIProps) {
  const insets = useSafeAreaInsets();
  const [levelUpText, setLevelUpText] = useState<string | null>(null);

  const showPauseButton =
    Platform.OS !== "web" &&
    !gameState.isGameOver &&
    !(gameState.continueCountdownRemaining && gameState.continueCountdownRemaining > 0);

  useEffect(() => {
    if (gameState.level && gameState.level > 1 && !gameState.isGameOver) {
      setLevelUpText(`SECTOR ${formatLevel(gameState.level)}`);
      const timer = setTimeout(() => setLevelUpText(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState.level, gameState.isGameOver]);

  const lives = gameState.lives ?? 0;
  const level = gameState.level ?? 1;
  const readyRemaining = gameState.readyRemaining ?? 0;
  const intermissionRemaining = gameState.intermissionRemaining ?? 0;
  const continueCountdownRemaining = gameState.continueCountdownRemaining ?? 0;
  const continuesRemaining = gameState.continuesRemaining ?? 0;

  return (
    <View style={styles.container}>
      <HUD
        lives={lives}
        score={gameState.score}
        level={level}
        highScore={highScore ?? 0}
        paddingTop={Math.max(insets.top, 14)}
        reservePauseSpace={showPauseButton}
      />

      {showPauseButton && (
        <PauseButton
          onPress={onPause}
          isPaused={isPaused}
          paddingTop={Math.max(insets.top, 14)}
        />
      )}

      {levelUpText && <LevelUpOverlay text={levelUpText} />}

      {readyRemaining > 0 && (
        <ReadyOverlay
          remaining={readyRemaining}
          level={level}
          message={gameState.storyBeatText}
        />
      )}

      {intermissionRemaining > 0 && (
        <IntermissionOverlay
          remaining={intermissionRemaining}
          level={level}
          title={gameState.chapterTitle}
          message={gameState.storyBeatText}
        />
      )}

      {continueCountdownRemaining > 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.continueOverlay}>
          <Text style={styles.systemEyebrow}>EMERGENCY RECOVERY // ODISEA-7</Text>
          <Text style={styles.continueText}>RESTORE PILOT LINK?</Text>
          <Text style={styles.continueCountdown}>
            {Math.ceil(continueCountdownRemaining)}
          </Text>
          <View style={styles.continueButtonRow}>
            <TouchableOpacity style={styles.yesButton} onPress={onContinue} activeOpacity={0.75}>
              <Text style={styles.yesButtonText}>RECONNECT // {continuesRemaining}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.noButton} onPress={onRestart} activeOpacity={0.75}>
              <Text style={styles.noButtonText}>ABORT</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {gameState.isGameOver && (
        <GameOverOverlay
          score={gameState.score}
          highScore={highScore ?? 0}
          onRestart={onRestart}
          mode={gameState.mode}
          level={gameState.level}
        />
      )}
    </View>
  );
});

const HUD: React.FC<{
  lives: number;
  score: number;
  level: number;
  highScore: number;
  paddingTop: number;
  reservePauseSpace: boolean;
}> = ({ lives, score, level, highScore, paddingTop, reservePauseSpace }) => (
  <Animated.View entering={FadeIn.duration(650)} style={[styles.topBar, { paddingTop }]}>
    {Platform.OS !== "web" && Canvas && BackdropBlur && Fill && (
      <Canvas style={StyleSheet.absoluteFill}>
        <BackdropBlur blur={8} clip={{ x: 0, y: 0, width: 2000, height: 120 }}>
          <Fill color="rgba(0, 0, 0, 0.28)" />
        </BackdropBlur>
      </Canvas>
    )}

    <View style={[styles.hudContent, reservePauseSpace && styles.hudContentWithPause]}>
      <HudPanel style={styles.hudLeftPanel} accent="system" moduleCode="LIFE//01">
        <Text style={styles.hudKicker}>ODISEA-7</Text>
        <View style={styles.lifeRow}>
          {lives > 0 ? (
            Array.from({ length: lives }).map((_, index) => (
              <ShipLifeIcon key={`life-${index}`} />
            ))
          ) : (
            <Text style={styles.signalLostMini}>SIGNAL LOST</Text>
          )}
        </View>
        <Text style={styles.hudMicro}>PILOT LINK // ACTIVE</Text>
      </HudPanel>

      <HudPanel style={styles.hudScorePanel} accent="system" moduleCode="SCR//02">
        <Text style={styles.hudLabel}>MISSION SCORE</Text>
        <Score score={score} />
        <Text style={styles.hudMicro}>RECORD {formatScore(highScore)}</Text>
      </HudPanel>

      <HudPanel style={styles.hudRightPanel} accent="warning" moduleCode="NAV//03">
        <Text style={styles.hudLabel}>KEPLER-791</Text>
        <Text style={styles.sectorValue}>SECTOR {formatLevel(level)}</Text>
        <View style={styles.threatRow}>
          <Text style={styles.hudMicro}>THREAT</Text>
          <View style={styles.threatBars}>
            <View style={styles.threatBarOn} />
            <View style={styles.threatBarOn} />
            <View style={styles.threatBarOn} />
            <View style={styles.threatBarOff} />
          </View>
        </View>
      </HudPanel>
    </View>
  </Animated.View>
);

const HudPanel: React.FC<{
  children: React.ReactNode;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
  accent?: "system" | "warning" | "success" | "danger";
  moduleCode?: string;
}> = ({ children, style, accent = "system", moduleCode }) => {
  const accentColor =
    accent === "warning"
      ? COLORS.warning
      : accent === "success"
        ? COLORS.success
        : accent === "danger"
          ? COLORS.danger
          : COLORS.system;

  return (
    <View style={[styles.hudPanel, style]}>
      <TechnicalCorners color={accentColor} compact />
      <View style={[styles.panelAccentTop, { backgroundColor: accentColor }]} />
      <View style={[styles.panelAccentBottom, { backgroundColor: accentColor }]} />
      {moduleCode && <Text style={[styles.moduleCode, { color: accentColor }]}>{moduleCode}</Text>}
      {children}
    </View>
  );
};

const TechnicalCorners: React.FC<{ color: string; compact?: boolean }> = ({ color, compact }) => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View
      style={[
        styles.cornerMark,
        styles.cornerTopLeft,
        compact && styles.cornerMarkCompact,
        { borderColor: color },
      ]}
    />
    <View
      style={[
        styles.cornerMark,
        styles.cornerTopRight,
        compact && styles.cornerMarkCompact,
        { borderColor: color },
      ]}
    />
    <View
      style={[
        styles.cornerMark,
        styles.cornerBottomLeft,
        compact && styles.cornerMarkCompact,
        { borderColor: color },
      ]}
    />
    <View
      style={[
        styles.cornerMark,
        styles.cornerBottomRight,
        compact && styles.cornerMarkCompact,
        { borderColor: color },
      ]}
    />
  </View>
);

const TechnicalRail: React.FC<{
  color: string;
  label: string;
  align?: "left" | "right";
}> = ({ color, label, align = "left" }) => (
  <View style={[styles.technicalRail, align === "right" && styles.technicalRailRight]}>
    <Text style={[styles.technicalRailLabel, { color }]}>{label}</Text>
    <View style={styles.technicalRailTicks}>
      {Array.from({ length: 7 }).map((_, index) => (
        <View
          key={`${label}-${index}`}
          style={[
            styles.technicalRailTick,
            { backgroundColor: color, opacity: index % 3 === 0 ? 0.9 : 0.32 },
          ]}
        />
      ))}
    </View>
  </View>
);

const ShipLifeIcon: React.FC = () => (
  <View style={styles.shipIcon} accessibilityLabel="life">
    <View style={styles.shipNose} />
    <View style={styles.shipBody} />
    <View style={[styles.shipWing, styles.shipWingLeft]} />
    <View style={[styles.shipWing, styles.shipWingRight]} />
    <View style={styles.shipEngine} />
  </View>
);

const Score: React.FC<{ score: number }> = ({ score }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.08, { damping: 6, stiffness: 140 }),
      withSpring(1, { damping: 8, stiffness: 130 })
    );
  }, [score, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={styles.scoreValue}>{formatScore(score)}</Text>
    </Animated.View>
  );
};

const PauseButton: React.FC<{
  onPress?: () => void;
  isPaused?: boolean;
  paddingTop: number;
}> = ({ onPress, isPaused, paddingTop }) => (
  <TouchableOpacity
    style={[styles.pauseButton, { top: paddingTop }]}
    onPress={onPress}
    activeOpacity={0.72}
  >
    <Text style={styles.pauseButtonMeta}>SYS</Text>
    <Text style={styles.pauseButtonText}>{isPaused ? ">" : "II"}</Text>
  </TouchableOpacity>
);

const ReadyOverlay: React.FC<{
  remaining: number;
  level: number;
  message?: string;
}> = ({ remaining, level, message }) => {
  const countdown = Math.max(0, Math.ceil(remaining));

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(350)}
      style={styles.centerOverlay}
      pointerEvents="none"
    >
      <View style={styles.cinematicLetterboxTop} />
      <View style={styles.cinematicLetterboxBottom} />
      <TechnicalRail color={COLORS.system} label="COMBAT BUS A" />
      <TechnicalRail color={COLORS.warning} label="THREAT LOCK" align="right" />

      <View style={styles.readyFrame}>
        <TechnicalCorners color={COLORS.system} />

        <View style={styles.readyTopLine}>
          <Text style={styles.systemEyebrow}>ODISEA-7 // COMBAT SYSTEM</Text>
          <Text style={styles.systemCode}>HX-791-{formatLevel(level)}</Text>
        </View>

        <View style={styles.systemDivider} />

        <View style={styles.readyMissionRow}>
          <Text style={styles.readySector}>SECTOR {formatLevel(level)}</Text>
          <Text style={styles.readyAlert}>WARNING // CONTACT</Text>
        </View>

        <Text style={styles.readyTitle}>{message ?? "HOSTILES INBOUND"}</Text>

        <View style={styles.countdownStage}>
          <View style={styles.countdownHairline} />
          <Animated.Text
            key={`ready-count-${countdown}`}
            entering={ZoomIn.duration(190)}
            style={styles.readyTimer}
          >
            {String(countdown).padStart(2, "0")}
          </Animated.Text>
          <View style={styles.countdownHairline} />
        </View>

        <View style={styles.readyStatusRow}>
          <Text style={styles.readyFooter}>TARGETING ARRAY</Text>
          <View style={styles.readyStatusBars}>
            <View style={styles.statusBarOn} />
            <View style={styles.statusBarOn} />
            <View style={styles.statusBarOn} />
            <View style={styles.statusBarOn} />
            <View style={styles.statusBarOff} />
          </View>
          <Text style={styles.readyFooter}>SYNC 84%</Text>
        </View>

        <View style={styles.readySweepLine} />
      </View>
    </Animated.View>
  );
};

const IntermissionOverlay: React.FC<{
  remaining: number;
  level: number;
  title?: string;
  message?: string;
}> = ({ remaining, level, title, message }) => {
  const nextSector = level + 1;
  const countdown = Math.max(0, Math.ceil(remaining));

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      exiting={FadeOut.duration(350)}
      style={styles.centerOverlay}
      pointerEvents="none"
    >
      <View style={styles.cinematicLetterboxTop} />
      <View style={styles.cinematicLetterboxBottom} />
      <TechnicalRail color={COLORS.success} label="SECTOR STATUS" />
      <TechnicalRail color={COLORS.system} label="NAV VECTOR" align="right" />

      <Animated.View entering={SlideInDown.duration(420)} style={styles.intermissionFrame}>
        <TechnicalCorners color={COLORS.success} />

        <View style={styles.intermissionTopRow}>
          <Text style={styles.intermissionSystemLabel}>ODISEA-7 // MISSION SYSTEM</Text>
          <Text style={styles.intermissionStatus}>STATUS // GREEN</Text>
        </View>

        <View style={styles.intermissionSuccessRule} />
        <Text style={styles.intermissionKicker}>COMBAT VECTOR COMPLETE</Text>
        <Text style={styles.intermissionTitle}>{title ?? "SECTOR CLEARED"}</Text>
        <Text style={styles.intermissionSub}>
          {message ?? "CALCULATING NEXT VECTOR..."}
        </Text>

        <View style={styles.intermissionRouteRow}>
          <View style={styles.routeNodeActive} />
          <View style={styles.routeLine} />
          <View style={styles.routeNodeActive} />
          <View style={styles.routeLineMuted} />
          <View style={styles.routeNodePending} />
        </View>

        <View style={styles.intermissionFooterRow}>
          <Text style={styles.intermissionFooterText}>
            NEXT // SECTOR {formatLevel(nextSector)}
          </Text>
          <Animated.Text
            key={`intermission-count-${countdown}`}
            entering={ZoomIn.duration(160)}
            style={styles.intermissionCountdown}
          >
            T-{String(countdown).padStart(2, "0")}
          </Animated.Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const LevelUpOverlay: React.FC<{ text: string }> = ({ text }) => (
  <Animated.View
    entering={BounceIn.duration(700)}
    exiting={FadeOut.duration(350)}
    style={styles.levelUpOverlay}
    pointerEvents="none"
  >
    <Text style={styles.levelUpKicker}>NAVIGATION UPDATE</Text>
    <Text style={styles.levelUpText}>{text}</Text>
  </Animated.View>
);

const GameOverOverlay: React.FC<{
  score: number;
  highScore: number;
  onRestart?: () => void;
  mode?: "deathmatch" | "story";
  level?: number;
}> = ({ score, highScore, onRestart, mode, level }) => {
  const isNewRecord = score >= highScore;
  let endingText = isNewRecord ? "MISSION RECORD OVERRIDDEN." : `ARCHIVE RECORD: ${formatScore(highScore)}`;

  if (mode === "story" && level !== undefined) {
    if (level < 5) {
      endingText =
        "Tu señal se apagó en el cinturón Kepler-791. Helios Extractive borró todo registro de la ODISEA-7: el secreto murió contigo.";
    } else if (level <= 10) {
      endingText =
        "La caja negra fue transmitida, pero los drones de Helios interceptaron tu escape a un paso de la Tierra.";
    } else if (isNewRecord) {
      endingText =
        "La señal llegó a la Tierra. La verdad sobre Helios Extractive quedó expuesta. El archivo te identifica como el Fantasma de Kepler.";
    } else {
      endingText =
        "Te fusionaste con el enjambre. Tu eco seguirá orbitando Kepler-791, oculto entre las señales que Helios intenta borrar.";
    }
  }

  return (
    <Animated.View entering={FadeIn.duration(450)} style={styles.gameOverOverlay}>
      {Platform.OS !== "web" && Canvas && BackdropBlur && Fill && (
        <Canvas style={StyleSheet.absoluteFill}>
          <BackdropBlur blur={18}>
            <Fill color="rgba(0, 0, 0, 0.68)" />
          </BackdropBlur>
        </Canvas>
      )}

      <View style={styles.gameOverNoiseLine} />

      <Animated.View
        entering={SlideInDown.delay(120).duration(520)}
        style={styles.gameOverTerminal}
      >
        <View style={styles.gameOverHeaderRow}>
          <Text style={styles.gameOverSystemLabel}>ODISEA-7 // FLIGHT RECORDER</Text>
          <Text style={styles.gameOverErrorCode}>ERR.SIG-07</Text>
        </View>

        <View style={styles.gameOverDivider} />

        <Animated.Text
          entering={ZoomIn.delay(180).duration(480)}
          style={styles.signalLostTitle}
        >
          SIGNAL LOST
        </Animated.Text>
        <Text style={styles.gameOverSubhead}>CONNECTION TERMINATED // KEPLER-791</Text>

        <View style={styles.gameOverStatsRow}>
          <View style={styles.gameOverStatBlock}>
            <Text style={styles.gameOverStatLabel}>LAST SCORE</Text>
            <Text style={styles.gameOverStatValue}>{formatScore(score)}</Text>
          </View>
          <View style={styles.gameOverStatSeparator} />
          <View style={styles.gameOverStatBlock}>
            <Text style={styles.gameOverStatLabel}>ARCHIVE RECORD</Text>
            <Text style={[styles.gameOverStatValue, isNewRecord && styles.newRecordValue]}>
              {formatScore(Math.max(score, highScore))}
            </Text>
          </View>
        </View>

        {isNewRecord && <Text style={styles.newRecordFlag}>// NEW ARCHIVE RECORD //</Text>}

        <View style={styles.transmissionBox}>
          <Text style={styles.transmissionLabel}>FINAL TRANSMISSION</Text>
          <Text style={styles.transmissionText}>{endingText}</Text>
        </View>

        <TouchableOpacity style={styles.restartButton} onPress={onRestart} activeOpacity={0.72}>
          <View style={styles.restartAccent} />
          <Text style={styles.restartButtonMeta}>MISSION CONTROL</Text>
          <Text style={styles.restartButtonText}>REINITIALIZE MISSION</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: "box-none",
  },

  // HUD ---------------------------------------------------------------------
  topBar: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    overflow: "hidden",
  },
  hudContent: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  hudContentWithPause: {
    paddingRight: 58,
  },
  hudPanel: {
    minHeight: 68,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 3,
    justifyContent: "center",
    overflow: "hidden",
  },
  moduleCode: {
    position: "absolute",
    top: 4,
    right: 6,
    fontFamily: DATA_FONT,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
    opacity: 0.72,
  },
  cornerMark: {
    position: "absolute",
    width: 14,
    height: 14,
    opacity: 0.68,
  },
  cornerMarkCompact: {
    width: 8,
    height: 8,
    opacity: 0.5,
  },
  cornerTopLeft: {
    top: 5,
    left: 5,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  cornerTopRight: {
    top: 5,
    right: 5,
    borderTopWidth: 1,
    borderRightWidth: 1,
  },
  cornerBottomLeft: {
    bottom: 5,
    left: 5,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
  },
  cornerBottomRight: {
    right: 5,
    bottom: 5,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  hudLeftPanel: {
    flex: 0.95,
    alignItems: "flex-start",
  },
  hudScorePanel: {
    flex: 1.22,
    alignItems: "center",
  },
  hudRightPanel: {
    flex: 1,
    alignItems: "flex-end",
  },
  panelAccentTop: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 26,
    height: 2,
  },
  panelAccentBottom: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 26,
    height: 2,
  },
  hudKicker: {
    color: COLORS.white,
    fontFamily: DISPLAY_FONT,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2.1,
  },
  hudLabel: {
    color: COLORS.whiteMuted,
    fontFamily: DISPLAY_FONT,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  hudMicro: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  lifeRow: {
    minHeight: 20,
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  signalLostMini: {
    color: COLORS.red,
    fontFamily: DATA_FONT,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  shipIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  shipNose: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: COLORS.cyan,
    position: "absolute",
    top: 0,
  },
  shipBody: {
    width: 5,
    height: 9,
    backgroundColor: COLORS.cyan,
    position: "absolute",
    top: 6,
  },
  shipWing: {
    width: 8,
    height: 2,
    backgroundColor: COLORS.cyan,
    position: "absolute",
    top: 10,
  },
  shipWingLeft: {
    left: 1,
    transform: [{ rotate: "-22deg" }],
  },
  shipWingRight: {
    right: 1,
    transform: [{ rotate: "22deg" }],
  },
  shipEngine: {
    width: 2,
    height: 3,
    backgroundColor: COLORS.amber,
    position: "absolute",
    bottom: 0,
  },
  scoreValue: {
    color: COLORS.cyan,
    fontFamily: DATA_FONT,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 2.1,
    marginTop: 1,
    ...(Platform.OS === "web"
      ? { textShadow: "0 0 10px rgba(0, 232, 210, 0.46)" }
      : {
          textShadowColor: "rgba(0, 232, 210, 0.46)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        }),
  },
  sectorValue: {
    color: COLORS.amber,
    fontFamily: DATA_FONT,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginTop: 3,
  },
  threatRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  threatBars: {
    flexDirection: "row",
    marginLeft: 6,
  },
  threatBarOn: {
    width: 8,
    height: 3,
    backgroundColor: COLORS.amber,
    marginLeft: 2,
  },
  threatBarOff: {
    width: 8,
    height: 3,
    backgroundColor: "rgba(246, 200, 95, 0.18)",
    marginLeft: 2,
  },

  // Pause -------------------------------------------------------------------
  pauseButton: {
    position: "absolute",
    right: 12,
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.panelStrong,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1001,
  },
  pauseButtonMeta: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 6,
    letterSpacing: 1,
    marginBottom: 1,
  },
  pauseButtonText: {
    color: COLORS.cyan,
    fontFamily: DATA_FONT,
    fontSize: 16,
    fontWeight: "900",
  },

  // Shared overlays ---------------------------------------------------------
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 6, 6, 0.56)",
  },
  cinematicLetterboxTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "8%",
    backgroundColor: "rgba(0, 5, 5, 0.72)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(243, 247, 246, 0.08)",
  },
  cinematicLetterboxBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "8%",
    backgroundColor: "rgba(0, 5, 5, 0.72)",
    borderTopWidth: 1,
    borderTopColor: "rgba(243, 247, 246, 0.08)",
  },
  technicalRail: {
    position: "absolute",
    left: 18,
    top: "27%",
    bottom: "27%",
    width: 18,
    alignItems: "center",
    justifyContent: "space-between",
  },
  technicalRailRight: {
    left: undefined,
    right: 18,
  },
  technicalRailLabel: {
    fontFamily: DATA_FONT,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
    transform: [{ rotate: "-90deg" }],
    width: 110,
    textAlign: "center",
  },
  technicalRailTicks: {
    flex: 1,
    width: 12,
    marginTop: 20,
    marginBottom: 4,
    justifyContent: "space-around",
    alignItems: "center",
  },
  technicalRailTick: {
    width: 7,
    height: 1,
  },
  systemEyebrow: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  systemCode: {
    color: COLORS.amber,
    fontFamily: DATA_FONT,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  systemDivider: {
    width: "100%",
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  // READY -------------------------------------------------------------------
  readyFrame: {
    width: "82%",
    maxWidth: 650,
    minHeight: 310,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(1, 12, 12, 0.8)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  readyTopLine: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  readyMissionRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  readySector: {
    color: COLORS.warning,
    fontFamily: DATA_FONT,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
  },
  readyAlert: {
    color: COLORS.warning,
    fontFamily: DATA_FONT,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  readyTitle: {
    color: COLORS.white,
    fontFamily: DISPLAY_FONT,
    fontSize: 37,
    fontWeight: "900",
    letterSpacing: 3.5,
    textAlign: "center",
  },
  countdownStage: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  countdownHairline: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0, 232, 210, 0.22)",
  },
  readyTimer: {
    color: COLORS.system,
    fontFamily: DATA_FONT,
    fontSize: 82,
    fontWeight: "900",
    letterSpacing: -2,
    marginHorizontal: 22,
    ...(Platform.OS === "web"
      ? { textShadow: "0 0 18px rgba(0, 232, 210, 0.52)" }
      : {
          textShadowColor: "rgba(0, 232, 210, 0.52)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 14,
        }),
  },
  readyStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  readyFooter: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  readyStatusBars: {
    flexDirection: "row",
    marginHorizontal: 9,
  },
  statusBarOn: {
    width: 16,
    height: 3,
    backgroundColor: COLORS.cyan,
    marginHorizontal: 1,
  },
  statusBarOff: {
    width: 16,
    height: 3,
    backgroundColor: COLORS.cyanFaint,
    marginHorizontal: 1,
  },
  readySweepLine: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 14,
    height: 1,
    backgroundColor: "rgba(0, 232, 210, 0.16)",
  },

  // Intermission ------------------------------------------------------------
  intermissionFrame: {
    width: "82%",
    maxWidth: 660,
    minHeight: 300,
    paddingHorizontal: 30,
    paddingVertical: 26,
    backgroundColor: COLORS.panelStrong,
    borderWidth: 1,
    borderColor: "rgba(103, 247, 167, 0.3)",
    overflow: "hidden",
  },
  intermissionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intermissionSystemLabel: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  intermissionStatus: {
    color: COLORS.success,
    fontFamily: DATA_FONT,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  intermissionSuccessRule: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(103, 247, 167, 0.32)",
    marginTop: 13,
    marginBottom: 20,
  },
  intermissionKicker: {
    color: COLORS.success,
    fontFamily: DATA_FONT,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 7,
  },
  intermissionTitle: {
    color: COLORS.success,
    fontFamily: DISPLAY_FONT,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 3.4,
    textAlign: "center",
  },
  intermissionSub: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 12,
    letterSpacing: 1.4,
    marginTop: 12,
    textAlign: "center",
  },
  intermissionRouteRow: {
    width: "72%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 26,
  },
  routeNodeActive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  routeNodePending: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.system,
    backgroundColor: "rgba(0, 232, 210, 0.08)",
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(103, 247, 167, 0.5)",
  },
  routeLineMuted: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0, 232, 210, 0.18)",
  },
  intermissionFooterRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(243, 247, 246, 0.08)",
  },
  intermissionFooterText: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  intermissionCountdown: {
    color: COLORS.system,
    fontFamily: DATA_FONT,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  // Continue ----------------------------------------------------------------
  continueOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 5, 5, 0.9)",
    pointerEvents: "auto",
  },
  continueText: {
    color: COLORS.white,
    fontFamily: DISPLAY_FONT,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 2.6,
    marginTop: 16,
  },
  continueCountdown: {
    color: COLORS.red,
    fontFamily: DATA_FONT,
    fontSize: 74,
    fontWeight: "900",
    marginVertical: 22,
  },
  continueButtonRow: {
    flexDirection: "row",
  },
  yesButton: {
    backgroundColor: COLORS.cyan,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    paddingHorizontal: 26,
    paddingVertical: 14,
    marginHorizontal: 6,
  },
  yesButtonText: {
    color: COLORS.ink,
    fontFamily: DATA_FONT,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  noButton: {
    backgroundColor: "rgba(255, 49, 91, 0.08)",
    borderWidth: 1,
    borderColor: COLORS.red,
    paddingHorizontal: 26,
    paddingVertical: 14,
    marginHorizontal: 6,
  },
  noButtonText: {
    color: COLORS.red,
    fontFamily: DATA_FONT,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // Level up ----------------------------------------------------------------
  levelUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  levelUpKicker: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 6,
  },
  levelUpText: {
    color: COLORS.cyan,
    fontFamily: DISPLAY_FONT,
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 4,
    ...(Platform.OS === "web"
      ? { textShadow: "0 0 16px rgba(0, 232, 210, 0.5)" }
      : {
          textShadowColor: "rgba(0, 232, 210, 0.5)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 14,
        }),
  },

  // GAME OVER ---------------------------------------------------------------
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    pointerEvents: "auto",
    paddingHorizontal: 20,
  },
  gameOverNoiseLine: {
    position: "absolute",
    top: "48%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 49, 91, 0.34)",
  },
  gameOverTerminal: {
    width: "100%",
    maxWidth: 700,
    backgroundColor: COLORS.panelStrong,
    borderWidth: 1,
    borderColor: "rgba(255, 49, 91, 0.34)",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  gameOverHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gameOverSystemLabel: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  gameOverErrorCode: {
    color: COLORS.red,
    fontFamily: DATA_FONT,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  gameOverDivider: {
    height: 1,
    backgroundColor: "rgba(255, 49, 91, 0.3)",
    marginVertical: 14,
  },
  signalLostTitle: {
    color: COLORS.red,
    fontFamily: DISPLAY_FONT,
    fontSize: 58,
    fontWeight: "900",
    letterSpacing: 5,
    textAlign: "center",
    ...(Platform.OS === "web"
      ? { textShadow: "0 0 18px rgba(255, 49, 91, 0.45)" }
      : {
          textShadowColor: "rgba(255, 49, 91, 0.45)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 15,
        }),
  },
  gameOverSubhead: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    textAlign: "center",
    marginTop: 3,
    marginBottom: 24,
  },
  gameOverStatsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "rgba(0, 232, 210, 0.04)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
  },
  gameOverStatBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  gameOverStatSeparator: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  gameOverStatLabel: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  gameOverStatValue: {
    color: COLORS.white,
    fontFamily: DATA_FONT,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 2,
  },
  newRecordValue: {
    color: COLORS.amber,
  },
  newRecordFlag: {
    color: COLORS.amber,
    fontFamily: DATA_FONT,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.6,
    textAlign: "center",
    marginTop: 10,
  },
  transmissionBox: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderLeftWidth: 2,
    borderLeftColor: COLORS.red,
  },
  transmissionLabel: {
    color: COLORS.red,
    fontFamily: DATA_FONT,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  transmissionText: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 11,
    lineHeight: 17,
  },
  restartButton: {
    alignSelf: "center",
    minWidth: 270,
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 13,
    backgroundColor: COLORS.cyanFaint,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    alignItems: "center",
    overflow: "hidden",
  },
  restartAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.cyan,
  },
  restartButtonMeta: {
    color: COLORS.whiteMuted,
    fontFamily: DATA_FONT,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  restartButtonText: {
    color: COLORS.cyan,
    fontFamily: DISPLAY_FONT,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
});
