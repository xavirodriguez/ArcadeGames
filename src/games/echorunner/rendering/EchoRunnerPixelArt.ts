/**
 * Deterministic pixel-art frames for Echo Runner's protagonist.
 * The sprite is an indexed-colour grid shared by Canvas and Skia.
 * Animation is derived from the simulation tick only.
 */
export type EchoRunnerSpriteMotion = "idle" | "run" | "jump" | "fall" | "attack";
export type EchoRunnerSpritePalette = {
  archiveBorderDark: string;
  restorationCyan: string;
  restorationWhite: string;
  corruptionCrimson: string;
  restorationGold: string;
};

const IDLE_FRAME = [
  "......RR........", ".....RRKR.......", "....RKKKKR......", "....KWWWWK......",
  "....KWCCWK......", "....KCCCCK......", ".....KKKK.......", "...KKKKKKKK.....",
  "..KCCCCCCCCK....", ".KCCCWCCCCCCK...", "..KCCCCCCCCCCK..", "..KCCCGGCCCK....",
  "..KCCCCCCCCK....", "...KKCCCCKK.....", "....KKCCKK......", ".....K..K.......",
  ".....K..K.......", "....KK..KK......", "...KK....KK.....", "...KK....KK.....",
] as const;
const RUN_FRAME_A = [
  "......RR........", ".....RRKR.......", "....RKKKKR......", "....KWWWWK......",
  "....KWCCWK......", "....KCCCCK......", ".....KKKK.......", "...KKKKKKKK.....",
  "..KCCCCCCCCK....", ".KCCCWCCCCCCK...", "..KCCCCCCCCCCK..", "..KCCCGGCCCK....",
  "..KCCCCCCCCK....", "...KKCCCCKK.....", "....K....K......", "...KK....KK.....",
  "..KK......KK....", "....KK..KK......", ".....K..K.......", "................",
] as const;
const RUN_FRAME_B = [
  "......RR........", ".....RRKR.......", "....RKKKKR......", "....KWWWWK......",
  "....KWCCWK......", "....KCCCCK......", ".....KKKK.......", "...KKKKKKKK.....",
  "..KCCCCCCCCK....", ".KCCCWCCCCCCK...", "..KCCCCCCCCCCK..", "..KCCCGGCCCK....",
  "..KCCCCCCCCK....", "...KKCCCCKK.....", "......K....K....", ".....KK....KK...",
  "....KK......KK..", "....KK..KK......", ".....K..K.......", "................",
] as const;
const JUMP_FRAME = [
  "......RR........", ".....RRKR.......", "....RKKKKR......", "....KWWWWK......",
  "....KWCCWK......", "....KCCCCK......", ".....KKKK.......", "...KKKKKKKK.....",
  "..KCCCCCCCCK....", ".KCCCWCCCCCCK...", "..KCCCCCCCCCCK..", "..KCCCGGCCCK....",
  "..KCCCCCCCCK....", "...KKCCCCKK.....", "....KK..KK......", "...KK....KK.....",
  "..KK......KK....", "................", "................", "................",
] as const;
const FALL_FRAME = [
  "......RR........", ".....RRKR.......", "....RKKKKR......", "....KWWWWK......",
  "....KWCCWK......", "...K.CCCC.K.....", "..K..KKKK..K....", "...KKKKKKKK.....",
  "..KCCCCCCCCK....", ".KCCCWCCCCCCK...", "..KCCCCCCCCCCK..", "..KCCCGGCCCK....",
  "...KCCCCCCK.....", "...K..KK..K.....", "..KK......KK....", "...KK....KK.....",
  "................", "................", "................", "................",
] as const;
const ATTACK_FRAME = [
  "......RR........", ".....RRKR.......", "....RKKKKR......", "....KWWWWK......",
  "....KWCCWK......", "....KCCCCK......", ".....KKKK.......", "...KKKKKKKK.....",
  "..KCCCCCCCCK....", ".KCCCWCCCCCCK...", "..KCCCCCCCCKGG..", "..KCCCCGGCCKGGW.",
  "..KCCCCCCCCK.GG.", "...KKCCCCKK.....", "....KKCCKK......", ".....K..K.......",
  ".....K..K.......", "....KK..KK......", "...KK....KK.....", "...KK....KK.....",
] as const;
const SPRITE_FRAMES: Record<EchoRunnerSpriteMotion, readonly (readonly string[])[]> = {
  idle: [IDLE_FRAME],
  run: [RUN_FRAME_A, RUN_FRAME_B],
  jump: [JUMP_FRAME],
  fall: [FALL_FRAME],
  attack: [ATTACK_FRAME],
};

/** Resolves an animation state without randomness or wall-clock time. */
export function resolveEchoRunnerSpriteMotion(
  vx: number,
  vy: number,
  isGrounded: boolean,
  isAttacking: boolean,
): EchoRunnerSpriteMotion {
  if (isAttacking) return "attack";
  if (!isGrounded) return vy < 0 ? "jump" : "fall";
  return Math.abs(vx) > 8 ? "run" : "idle";
}

/** Returns the indexed-colour sprite frame for a simulation tick. */
export function getEchoRunnerSpriteFrame(
  motion: EchoRunnerSpriteMotion,
  tick: number,
): readonly string[] {
  const frames = SPRITE_FRAMES[motion];
  const frameIndex = motion === "run" ? Math.floor(Math.max(0, tick) / 4) % frames.length : 0;
  return frames[frameIndex] ?? IDLE_FRAME;
}

/** Maps indexed colours to the active game theme. */
/**
 * RLE-scans a sprite frame and invokes a callback for each contiguous color run.
 * Eliminates duplicate row/character loop implementations in Canvas and Skia drawers.
 */
export function drawRleSpriteFrame<TPalette extends EchoRunnerSpritePalette>(
  frame: readonly string[],
  palette: TPalette,
  drawRun: (x: number, y: number, runLength: number, color: string) => void
): void {
  for (let y = 0; y < frame.length; y++) {
    const row = frame[y] ?? "";
    let x = 0;
    while (x < row.length) {
      const token = row[x] ?? ".";
      if (token === ".") {
        x++;
        continue;
      }
      let runLength = 1;
      while (x + runLength < row.length && row[x + runLength] === token) {
        runLength++;
      }
      const color = resolveEchoRunnerSpriteColor(token, palette);
      if (color) {
        drawRun(x, y, runLength, color);
      }
      x += runLength;
    }
  }
}

export function resolveEchoRunnerSpriteColor(
  token: string,
  palette: EchoRunnerSpritePalette,
): string | undefined {
  switch (token) {
    case "K": return palette.archiveBorderDark;
    case "C": return palette.restorationCyan;
    case "W": return palette.restorationWhite;
    case "R": return palette.corruptionCrimson;
    case "G": return palette.restorationGold;
    default: return undefined;
  }
}
