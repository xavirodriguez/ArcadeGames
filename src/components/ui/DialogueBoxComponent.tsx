import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

export interface DialogueLine {
  speakerName?: string;
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
 * Cinematographic Dialogue & Cutscene Box with typewriter effect and accessible interaction.
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

  // Reset state when dialogueQueue changes or resets
  useEffect(() => {
    setCurrentLineIndex(0);
    setDisplayedText("");
    setIsLineComplete(false);
  }, [dialogueQueue]);

  // Typewriter effect interval
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
    if (!isLineComplete) {
      // Instantly finish current line text
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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleAdvance}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={currentLine?.speakerName ? `${currentLine.speakerName}: ${displayedText}` : displayedText}
      accessibilityHint={isLastLine ? "Avanza la escena" : "Siguiente línea de diálogo"}
    >
      {currentLine?.speakerName ? (
        <Text style={styles.speakerText}>{currentLine.speakerName}</Text>
      ) : null}

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
    backgroundColor: "rgba(10, 14, 39, 0.92)",
    borderColor: colors.cyan,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.sm,
    elevation: 5,
  },
  speakerText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  bodyText: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 22,
  },
  cursor: {
    color: colors.cyan,
    fontWeight: "bold",
  },
  footer: {
    marginTop: spacing.sm,
    alignItems: "flex-end",
  },
  hintText: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: "italic",
  },
});
