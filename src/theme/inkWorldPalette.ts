/**
 * Canonical ink-wash / parchment palette for the project's shared medieval-fantasy
 * Japanese aesthetic (sumi-e over parchment), decided as the "mundo no espacial"
 * direction for the story mode.
 *
 * This is the SINGLE SOURCE OF TRUTH for new ink-wash work going forward (the Tower
 * Defense art-direction doc and future Echo Runner reskins consume this). It is NOT
 * a retrofit: three independent ink/parchment palettes already shipped before this
 * module existed —
 *   - SumiETheme (src/games/hitandrun/rendering/theme/sumi-e/SumiETheme.ts): ink
 *     #171817, background #e8e3d4
 *   - AQUI_HAY_DRAGONES_PALETTE (src/theme/conceptPacks/aquiHayDragonesConceptPack.ts):
 *     ink #2B2118, parchment #E8D9B5
 * — and neither has been changed by this file. Whether to migrate SumiETheme's live,
 * already-shipped colors onto these tokens is a separate decision, not made here.
 *
 * Values are sourced from the Tower Defense art-direction doc (v0.1), the most recent
 * and most complete of the three, explicitly authored as the shared-world reference —
 * cross-checked against the other two palettes for overlapping roles.
 */

export interface InkWorldPaletteTokens {
  /** Outlines, text, silhouettes. */
  readonly ink: string;
  /** Softer ink tone for secondary shadows/outlines. */
  readonly inkMuted: string;
  /** Base parchment / paper fill. */
  readonly parchment: string;
  /** Aged parchment — stains, panel interiors. */
  readonly parchmentAged: string;
  /** Edge/border tone for parchment panels and frames. */
  readonly parchmentEdge: string;
  /** Fog / mist bands between depth layers. */
  readonly mist: string;
  /** Stone road / path tone. */
  readonly stoneRoad: string;
  /** Danger / hostile — reserved for threats only, never for goals or structures. */
  readonly threatRed: string;
  /** Structural red (torii, wooden pillars) — muted, never confused with threatRed. */
  readonly structureRed: string;
  /** Frame, upgrades, currency. */
  readonly gold: string;
  /** Ofuda talisman yellow. */
  readonly talismanYellow: string;
  /** The one saturated cool color — energy, projectiles, magic. */
  readonly energyBlue: string;
  /** Bronze/teal accent (bell, shrine metalwork). */
  readonly bronzeGreen: string;
  /** The one pure white — reserved for a single distinguishing element per game. */
  readonly whiteAccent: string;
}

export const INK_WORLD_PALETTE: InkWorldPaletteTokens = {
  ink: "#1B1B1F",
  inkMuted: "#5A4630",
  parchment: "#E9DFC6",
  parchmentAged: "#C9B88F",
  parchmentEdge: "#B9A06B",
  mist: "#DCE0DD",
  stoneRoad: "#A9A9A4",
  threatRed: "#C8372D",
  structureRed: "#8E3A2B",
  gold: "#C9A24A",
  talismanYellow: "#E3B93C",
  energyBlue: "#5CC8FF",
  bronzeGreen: "#4F7F78",
  whiteAccent: "#F4F1EA"
};
