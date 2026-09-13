import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { semanticColors, fonts, typography, spacing, radius } from "../../theme";
import { hapticSelection } from "../../utils/haptics";

export interface DialogueLine {
  speakerName?: string;
  portraitCode?: string;
  textKey: string;
  id?: string;
}

export interface DialogueBoxComponentProps {
  dialogueQueue?: DialogueLine[];
  onComplete?: () => void;
  typewriterSpeed?: number;
  characterPause?: number;
  getLocalizedText?: (key?: string) => string;
}

/**
 * Cinematographic Dialogue & Cutscene Box with typewriter effect, speaker badge, and haptic feedback.
 */
export const DialogueBoxComponent: React.FC<DialogueBoxComponentProps> = ({
  dialogueQueue = [],
  onComplete,
  typewriterSpeed = 25,
  getLocalizedText = (key) => key || ""
}) => {
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isLineComplete, setIsLineComplete] = useState<boolean>(false);

  const currentLine = dialogueQueue[currentLineIndex];
  const fullText = currentLine ? getLocalizedText(currentLine.textKey) : "";

  useEffect(() => {
    setCurrentLineIndex(0);
    setDisplayedText("");
    setIsLineComplete(false);
  }, [dialogueQueue]);

  useEffect(() => {
    if (!currentLine || !fullText) {
      setDisplayedText("");
      setIsLineComplete(true);
      return;
    }

    setDisplayedText("");
    setIsLineComplete(false);

    let charIdx = 0;
    const interval = setInterval(() => {
      charIdx++;
      setDisplayedText(fullText.slice(0, charIdx));
      if (charIdx >= fullText.length) {
        setIsLineComplete(true);
        clearInterval(interval);
      }
    }, typewriterSpeed);

    return () => clearInterval(interval);
  }, [currentLineIndex, fullText, typewriterSpeed, currentLine]);

  const handleAdvance = useCallback(() => {
    hapticSelection();
    if (!isLineComplete) {
      setDisplayedText(fullText);
      setIsLineComplete(true);
      return;
    }

    if (currentLineIndex < dialogueQueue.length - 1) {
      setCurrentLineIndex((prev) => prev + 1);
    } else {
      onComplete?.();
    }
  }, [isLineComplete, fullText, currentLineIndex, dialogueQueue.length, onComplete]);

  if (!currentLine && dialogueQueue.length === 0) {
    return null;
  }

  const isLastLine = currentLineIndex === dialogueQueue.length - 1;
  const speaker = currentLine?.speakerName || "ODISEA-7 COMMS";
  const portrait = currentLine?.portraitCode || speaker.charAt(0);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleAdvance}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${speaker}: ${displayedText}`}
      accessibilityHint={isLastLine ? "Avanza la escena" : "Siguiente línea de diálogo"}
    >
      <View style={styles.headerRow}>
        <View style={styles.portraitBadge}>
          <Text style={styles.portraitText}>{portrait}</Text>
        </View>

        <Text style={styles.speakerText}>{speaker}</Text>
      </View>

      <Text style={styles.bodyText}>
        {displayedText}
        {!isLineComplete && <Text style={styles.cursor}> ▌</Text>}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.hintText}>
          {!isLineComplete
            ? "Toca para completar..."
            : isLastLine
              ? "Toca para continuar ▸"
              : "Toca para siguiente ▸"}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: semanticColors.background.panelStrong,
    borderColor: semanticColors.system,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  portraitBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.round,
    backgroundColor: "rgba(0, 232, 210, 0.2)",
    borderWidth: 1,
    borderColor: semanticColors.system,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  portraitText: {
    fontFamily: fonts.data,
    fontSize: 11,
    fontWeight: "bold",
    color: semanticColors.system,
  },
  speakerText: {
    color: semanticColors.system,
    fontFamily: fonts.data,
    fontSize: typography.sizes.small,
    fontWeight: "bold",
    letterSpacing: typography.letterSpacing.wide,
    textTransform: "uppercase",
  },
  bodyText: {
    color: semanticColors.neutral[50],
    fontFamily: fonts.data,
    fontSize: 15,
    lineHeight: 22,
  },
  cursor: {
    color: semanticColors.system,
    fontWeight: "bold",
  },
  footer: {
    marginTop: spacing.sm,
    alignItems: "flex-end",
  },
  hintText: {
    color: semanticColors.neutral[300],
    fontFamily: fonts.data,
    fontSize: 11,
    fontStyle: "italic",
  },
});
