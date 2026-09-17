export interface HudViewModel {
  score: number;
  lives?: number;
  level?: number;
  highScore?: number;
  multiplier?: number;
  combo?: number;
  isGameOver?: boolean;
  isPaused?: boolean;
  sectorLabel?: string;
  chapterTitle?: string;
  storyBeatText?: string;
  dialogueText?: string;
  isDialogueActive?: boolean;
  readyRemaining?: number;
  intermissionRemaining?: number;
  continueCountdownRemaining?: number;
  continuesRemaining?: number;
  mode?: "deathmatch" | "story";
  [key: string]: any;
}

/**
 * Converts arbitrary ECS / GameState domain objects into a presentation-ready HudViewModel.
 */
export function toHudViewModel(gameState?: Record<string, any> | null): HudViewModel {
  if (!gameState) {
    return {
      score: 0,
      lives: 0,
      level: 1,
      isGameOver: false,
    };
  }

  return {
    score: typeof gameState.score === "number" ? gameState.score : 0,
    lives: typeof gameState.lives === "number" ? gameState.lives : undefined,
    level: typeof gameState.level === "number" ? gameState.level : undefined,
    highScore: typeof gameState.highScore === "number" ? gameState.highScore : undefined,
    multiplier: typeof gameState.multiplier === "number" ? gameState.multiplier : undefined,
    combo: typeof gameState.combo === "number" ? gameState.combo : undefined,
    isGameOver: Boolean(gameState.isGameOver),
    isPaused: Boolean(gameState.isPaused),
    sectorLabel: gameState.sectorLabel,
    chapterTitle: gameState.chapterTitle,
    storyBeatText: gameState.storyBeatText,
    dialogueText: gameState.dialogueText,
    isDialogueActive: Boolean(gameState.isDialogueActive),
    readyRemaining: gameState.readyRemaining,
    intermissionRemaining: gameState.intermissionRemaining,
    continueCountdownRemaining: gameState.continueCountdownRemaining,
    continuesRemaining: gameState.continuesRemaining,
    mode: gameState.mode,
  };
}
