/** Fallback presentation tokens for Centipede (soil / fauna palette). */
export const CENTIPEDE_VISUAL_TOKENS = {
  soil: "#0A0F1C",
  playerZone: "#0F182B",
  hairline: "#1F2D47",
  mushroomA: "#2DD4BF",
  mushroomB: "#8B7CF6",
  amber: "#FFC24B",
  centipedeHead: "#FF4D5E",
  centipedeBody: "#FF8A5B",
  centipedeLegs: "#FFB38A",
  eyeHighlight: "#FFE9D6",
  hudText: "#FFFFFF",
} as const;

export type CentipedeVisualTokens = typeof CENTIPEDE_VISUAL_TOKENS;
