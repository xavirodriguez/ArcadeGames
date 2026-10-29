/**
 * Canonical ink-wash / parchment palette for the project's shared medieval-fantasy
 * Japanese aesthetic (sumi-e over parchment). SINGLE SOURCE OF TRUTH for new work.
 *
 * Four canonical tones (provisional D1 until confirmed by design decision):
 *   sumi     = ink          #1B1B1F
 *   washi    = parchment    #E9DFC6
 *   shin-sha = threatRed    #C8372D
 *   kinjiki  = gold         #C9A24A
 *
 * Live shipped palettes that predate this module are intentionally NOT mutated here
 * (rule: do not change on-screen colors when deltaE00 >= 3 without explicit approval):
 *   - SumiETheme (hitandrun): ink #171817, bg #e8e3d4, vermilion #c0392b, gold #b8963e
 *   - AQUI_HAY_DRAGONES_PALETTE: ink #2B2118, parchment #E8D9B5, red #B5332E, gold #C9A227
 * See docs/design-system/base-tema-sumi-e-informe.md for the measured deltaE00 table.
 *
 * D3 extras (energyBlue, bronzeGreen, talismanYellow, whiteAccent, structureRed,
 * stoneRoad, mist, parchmentAged, parchmentEdge, inkMuted): keep while any game
 * still needs them; candidates for @deprecated once usage is audited.
 *
 * Contrast note (measured): gold and energyBlue fall below 3:1 on washi/mist.
 * Rule: those tones MUST be drawn with a sumi (#1B1B1F) outline / stroke when used
 * as fill for small graphic shapes or text. Registered in the design-system informe.
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
