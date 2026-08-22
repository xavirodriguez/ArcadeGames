import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const DEFAULT_KEY = "asteroids_high_score";

// Validation schema for high score
const HighScoreSchema = z.preprocess(
  (val) => (val === null ? 0 : Number.parseInt(val as string, 10)),
  z.number().min(0).catch(0)
);

/**
 * Hook to manage the persistent high score.
 *
 * @param key - The storage key to use for the high score.
 * @returns An object containing the current high score and a function to update it.
 */
export function useHighScore(key: string = DEFAULT_KEY) {
  const [highScore, setHighScore] = useState(0);
  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;

  useEffect(() => {
    let isMounted = true;
    const loadHighScore = async () => {
      try {
        const value = await AsyncStorage.getItem(key);
        const validatedScore = HighScoreSchema.parse(value);
        if (isMounted) {
          setHighScore(validatedScore);
        }
      } catch (error) {
        if (__DEV__) {
          console.error("Error loading high score:", error);
        }
        // Fallback to 0 if validation fails
        if (isMounted) {
          setHighScore(0);
        }
      }
    };
    loadHighScore();
    return () => {
      isMounted = false;
    };
  }, [key]);

  const updateHighScore = useCallback(
    async (score: number) => {
      if (score > highScoreRef.current) {
        try {
          await AsyncStorage.setItem(key, score.toString());
          highScoreRef.current = score;
          setHighScore(score);
        } catch (error) {
          if (__DEV__) {
            console.error("Error saving high score:", error);
          }
        }
      }
    },
    [key]
  );

  return { highScore, updateHighScore };
}
