/**
 * Canonical semantic colors for the ArcadeGames Sumi-e art direction.
 *
 * New Sumi-e presentation code should consume these role-based tokens instead of
 * introducing hex values locally. Existing palettes are intentionally not migrated
 * here; adapters can bridge them in a later phase without changing current renders.
 */

declare const hexColorBrand: unique symbol;
declare const semanticRoleBrand: unique symbol;

/** A runtime-validated six-digit CSS hex color. */
export type HexColor = string & { readonly [hexColorBrand]: true };

export type SumiESemanticRole =
  | "surface"
  | "text"
  | "threat"
  | "player"
  | "reward"
  | "landscape"
  | "ui";

/**
 * A hex color tagged with its semantic category.
 * Colors remain assignable to string APIs, but tokens from unrelated categories
 * cannot accidentally be assigned to each other.
 */
export type SemanticColor<Role extends SumiESemanticRole> = HexColor & {
  readonly [semanticRoleBrand]: Role;
};

export type SumiESurfaceColor = SemanticColor<"surface">;
export type SumiETextColor = SemanticColor<"text">;
export type SumiEThreatColor = SemanticColor<"threat">;
export type SumiEPlayerColor = SemanticColor<"player">;
export type SumiERewardColor = SemanticColor<"reward">;
export type SumiELandscapeColor = SemanticColor<"landscape">;
export type SumiEUiColor = SemanticColor<"ui">;

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

const SEMANTIC_GROUP_KEYS = [
  "surface",
  "text",
  "threat",
  "player",
  "reward",
  "landscape",
  "ui"
] as const;

const TOKEN_KEYS = {
  surface: ["paper", "paperLight"],
  text: ["primary", "secondary"],
  threat: ["body", "shadow", "glow", "inkCreature"],
  player: ["silhouette", "trail", "projectile", "projectileGlow", "shield"],
  reward: ["primary"],
  landscape: ["ink", "mist", "mountain", "water", "sand", "safeGround", "foliage"],
  ui: [
    "frame",
    "seal",
    "sealShadow",
    "panel",
    "bossBarBackground",
    "bossBarFill",
    "activeLife",
    "emptyLife"
  ]
} as const;

export interface SumiESurfaceTokens {
  /** Main aged washi background. */
  readonly paper: SumiESurfaceColor;
  /** Clean paper for panels and quiet UI surfaces. */
  readonly paperLight: SumiESurfaceColor;
}

export interface SumiETextTokens {
  /** Primary text, outlines and high-contrast ink details. */
  readonly primary: SumiETextColor;
  /** Secondary labels and subdued ink details; still readable on paper. */
  readonly secondary: SumiETextColor;
}

export interface SumiEThreatTokens {
  /** Main pigment for hostile bodies and red oni. */
  readonly body: SumiEThreatColor;
  /** Dark red used for threat shadows and secondary hostile details. */
  readonly shadow: SumiEThreatColor;
  /** High-intensity red reserved for hostile projectiles and threat highlights. */
  readonly glow: SumiEThreatColor;
  /** Near-black body fill for ink ghosts and other monochrome threats. */
  readonly inkCreature: SumiEThreatColor;
}

export interface SumiEPlayerTokens {
  /** Monochrome player silhouette and outline. */
  readonly silhouette: SumiEPlayerColor;
  /** Blue movement trails and player energy. */
  readonly trail: SumiEPlayerColor;
  /** Player-owned projectiles; distinct from hostile red projectiles. */
  readonly projectile: SumiEPlayerColor;
  /** Lighter blue core of player trails and projectiles. */
  readonly projectileGlow: SumiEPlayerColor;
  /** Player shield and protective abilities. */
  readonly shield: SumiEPlayerColor;
}

export interface SumiERewardTokens {
  /** Currency, ofuda, checkpoints and progression rewards. */
  readonly primary: SumiERewardColor;
}

export interface SumiELandscapeTokens {
  /** Mid-tone ink wash for rocks, trees and secondary landscape details. */
  readonly ink: SumiELandscapeColor;
  /** Fog and mist separating depth layers. */
  readonly mist: SumiELandscapeColor;
  /** Distant mountain washes. */
  readonly mountain: SumiELandscapeColor;
  /** Water surfaces in water-focused games such as Frogger. */
  readonly water: SumiELandscapeColor;
  /** Sand and riverbanks. */
  readonly sand: SumiELandscapeColor;
  /** Safe ground and traversable meadow areas. */
  readonly safeGround: SumiELandscapeColor;
  /** Pine foliage and dark vegetation. */
  readonly foliage: SumiELandscapeColor;
}

export interface SumiEUiTokens {
  /** Muted ornamental frame and parchment borders. */
  readonly frame: SumiEUiColor;
  /** Vermilion hanko seals and decorative UI accents, not gameplay threats. */
  readonly seal: SumiEUiColor;
  /** Darker seal pigment for stamped depth. */
  readonly sealShadow: SumiEUiColor;
  /** Light paper surface for UI panels. */
  readonly panel: SumiEUiColor;
  /** Ink backing of a boss health bar. */
  readonly bossBarBackground: SumiEUiColor;
  /** Red brush stroke showing remaining boss health. */
  readonly bossBarFill: SumiEUiColor;
  /** Filled life-pot or life indicator. */
  readonly activeLife: SumiEUiColor;
  /** Empty life-pot or life indicator. */
  readonly emptyLife: SumiEUiColor;
}

export interface SumiESemanticTokens {
  readonly surface: SumiESurfaceTokens;
  readonly text: SumiETextTokens;
  readonly threat: SumiEThreatTokens;
  readonly player: SumiEPlayerTokens;
  readonly reward: SumiERewardTokens;
  readonly landscape: SumiELandscapeTokens;
  readonly ui: SumiEUiTokens;
}

/** Raw input shape for validating a complete semantic palette. */
export type SumiESemanticTokenInput = {
  readonly [Group in keyof SumiESemanticTokens]: {
    readonly [Token in keyof SumiESemanticTokens[Group]]: string;
  };
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown, path: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`Invalid Sumi-e palette at "${path}": expected an object.`);
  }

  return value as UnknownRecord;
}

function assertExactKeys(
  record: UnknownRecord,
  expectedKeys: readonly string[],
  path: string
): void {
  const actualKeys = Object.keys(record);
  const missing = expectedKeys.filter((key) => !Object.prototype.hasOwnProperty.call(record, key));
  const unexpected = actualKeys.filter((key) => !expectedKeys.includes(key));

  if (missing.length > 0 || unexpected.length > 0) {
    const details = [
      missing.length > 0 ? `missing [${missing.join(", ")}]` : "",
      unexpected.length > 0 ? `unexpected [${unexpected.join(", ")}]` : ""
    ].filter(Boolean).join("; ");

    throw new TypeError(`Invalid Sumi-e palette at "${path}": ${details}.`);
  }
}

function readColor<Role extends SumiESemanticRole>(
  group: UnknownRecord,
  key: string,
  role: Role
): SemanticColor<Role> {
  const value = group[key];

  if (typeof value !== "string") {
    throw new TypeError(`Invalid Sumi-e ${role} color at "${role}.${key}": expected a string.`);
  }

  return createSumiESemanticColor(value, role);
}

/** Validate a hex value and attach its compile-time semantic role. */
export function createSumiESemanticColor<Role extends SumiESemanticRole>(
  value: string,
  role: Role
): SemanticColor<Role> {
  if (!HEX_COLOR_PATTERN.test(value)) {
    throw new TypeError(`Invalid Sumi-e ${role} color "${value}": expected #RRGGBB.`);
  }

  return value as SemanticColor<Role>;
}

function relativeLuminance(color: string): number {
  const channels = [1, 3, 5]
    .map((index) => Number.parseInt(color.slice(index, index + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function assertTextContrast(
  foregroundName: string,
  foreground: string,
  backgroundName: string,
  background: string
): void {
  const ratio = contrastRatio(foreground, background);

  if (ratio < 4.5) {
    throw new TypeError(
      `Invalid Sumi-e palette: ${foregroundName} contrast against ${backgroundName} is ${ratio.toFixed(2)}:1; expected at least 4.5:1.`
    );
  }
}

function assertDifferentRoles(
  firstName: string,
  firstColor: string,
  secondName: string,
  secondColor: string
): void {
  if (firstColor.toUpperCase() === secondColor.toUpperCase()) {
    throw new TypeError(
      `Invalid Sumi-e palette: ${firstName} and ${secondName} must use different colors.`
    );
  }
}

/**
 * Validate and freeze one complete Sumi-e palette.
 *
 * Validation is fail-fast: each semantic group must contain exactly its declared
 * fields, every field must be a six-digit #RRGGBB string, text must pass WCAG AA
 * contrast on both paper surfaces, and essential gameplay color roles must remain
 * distinguishable. The returned object is deeply frozen at the group level.
 */
export function createSumiESemanticTokens(
  input: SumiESemanticTokenInput
): SumiESemanticTokens {
  const source = asRecord(input, "palette");
  assertExactKeys(source, SEMANTIC_GROUP_KEYS, "palette");

  const surfaceSource = asRecord(source.surface, "surface");
  const textSource = asRecord(source.text, "text");
  const threatSource = asRecord(source.threat, "threat");
  const playerSource = asRecord(source.player, "player");
  const rewardSource = asRecord(source.reward, "reward");
  const landscapeSource = asRecord(source.landscape, "landscape");
  const uiSource = asRecord(source.ui, "ui");

  assertExactKeys(surfaceSource, TOKEN_KEYS.surface, "surface");
  assertExactKeys(textSource, TOKEN_KEYS.text, "text");
  assertExactKeys(threatSource, TOKEN_KEYS.threat, "threat");
  assertExactKeys(playerSource, TOKEN_KEYS.player, "player");
  assertExactKeys(rewardSource, TOKEN_KEYS.reward, "reward");
  assertExactKeys(landscapeSource, TOKEN_KEYS.landscape, "landscape");
  assertExactKeys(uiSource, TOKEN_KEYS.ui, "ui");

  const surface = Object.freeze({
    paper: readColor(surfaceSource, "paper", "surface"),
    paperLight: readColor(surfaceSource, "paperLight", "surface")
  });
  const text = Object.freeze({
    primary: readColor(textSource, "primary", "text"),
    secondary: readColor(textSource, "secondary", "text")
  });
  const threat = Object.freeze({
    body: readColor(threatSource, "body", "threat"),
    shadow: readColor(threatSource, "shadow", "threat"),
    glow: readColor(threatSource, "glow", "threat"),
    inkCreature: readColor(threatSource, "inkCreature", "threat")
  });
  const player = Object.freeze({
    silhouette: readColor(playerSource, "silhouette", "player"),
    trail: readColor(playerSource, "trail", "player"),
    projectile: readColor(playerSource, "projectile", "player"),
    projectileGlow: readColor(playerSource, "projectileGlow", "player"),
    shield: readColor(playerSource, "shield", "player")
  });
  const reward = Object.freeze({
    primary: readColor(rewardSource, "primary", "reward")
  });
  const landscape = Object.freeze({
    ink: readColor(landscapeSource, "ink", "landscape"),
    mist: readColor(landscapeSource, "mist", "landscape"),
    mountain: readColor(landscapeSource, "mountain", "landscape"),
    water: readColor(landscapeSource, "water", "landscape"),
    sand: readColor(landscapeSource, "sand", "landscape"),
    safeGround: readColor(landscapeSource, "safeGround", "landscape"),
    foliage: readColor(landscapeSource, "foliage", "landscape")
  });
  const ui = Object.freeze({
    frame: readColor(uiSource, "frame", "ui"),
    seal: readColor(uiSource, "seal", "ui"),
    sealShadow: readColor(uiSource, "sealShadow", "ui"),
    panel: readColor(uiSource, "panel", "ui"),
    bossBarBackground: readColor(uiSource, "bossBarBackground", "ui"),
    bossBarFill: readColor(uiSource, "bossBarFill", "ui"),
    activeLife: readColor(uiSource, "activeLife", "ui"),
    emptyLife: readColor(uiSource, "emptyLife", "ui")
  });

  assertTextContrast("text.primary", text.primary, "surface.paper", surface.paper);
  assertTextContrast("text.primary", text.primary, "surface.paperLight", surface.paperLight);
  assertTextContrast("text.secondary", text.secondary, "surface.paper", surface.paper);
  assertTextContrast("text.secondary", text.secondary, "surface.paperLight", surface.paperLight);

  assertDifferentRoles("threat.glow", threat.glow, "player.projectile", player.projectile);
  assertDifferentRoles("threat.body", threat.body, "reward.primary", reward.primary);
  assertDifferentRoles("ui.seal", ui.seal, "threat.body", threat.body);

  return Object.freeze({
    surface,
    text,
    threat,
    player,
    reward,
    landscape,
    ui
  } satisfies SumiESemanticTokens);
}

const DEFAULT_PALETTE_INPUT = {
  surface: {
    paper: "#E7DFCB",
    paperLight: "#F1EBDD"
  },
  text: {
    primary: "#151515",
    secondary: "#5F6466"
  },
  threat: {
    body: "#B3261E",
    shadow: "#A8281F",
    glow: "#FF3B30",
    inkCreature: "#151515"
  },
  player: {
    silhouette: "#151515",
    trail: "#4DA3FF",
    projectile: "#4DA3FF",
    projectileGlow: "#9CD0FF",
    shield: "#4DA3FF"
  },
  reward: {
    primary: "#E3A92F"
  },
  landscape: {
    ink: "#5F6466",
    mist: "#C9D1D2",
    mountain: "#8FA3B3",
    water: "#2E86B0",
    sand: "#E2D1A5",
    safeGround: "#7FA38A",
    foliage: "#4A5A52"
  },
  ui: {
    frame: "#B9A272",
    seal: "#D7473F",
    sealShadow: "#A8281F",
    panel: "#F1EBDD",
    bossBarBackground: "#151515",
    bossBarFill: "#B3261E",
    activeLife: "#151515",
    emptyLife: "#5F6466"
  }
} satisfies SumiESemanticTokenInput;

/** Canonical Sumi-e semantic palette, validated at module initialization. */
export const SUMI_E_SEMANTIC_TOKENS = createSumiESemanticTokens(DEFAULT_PALETTE_INPUT);
