/**
 * GameManifest — datos estáticos por juego.
 * Sin imports de React Native, Skia, Expo Router ni componentes.
 * Debe poder importarse desde Node (scripts, app.config.ts, CI).
 */

export const GAME_IDS = [
  "arkanoid",
  "asteroids",
  "centipede",
  "echorunner",
  "flappybird",
  "frogger",
  "galaxian",
  "geometrywars",
  "hitandrun",
  "outrun",
  "platformer",
  "pong",
  "racing",
  "space-invaders",
  "tower-defense",
  "vertical-shmup",
  "campaign",
  "cyoa",
  "blindstation",
] as const;

export type GameId = (typeof GAME_IDS)[number];

export type Orientation = "portrait" | "landscape" | "default";

export interface GameIcons {
  /** Ruta relativa al root del repo (ej. "./assets/icons/pong.png") */
  icon: string;
  adaptiveIcon?: string;
  splash?: string;
  favicon?: string;
}

export interface GameManifest {
  /** Identificador canónico (unión de literales) */
  id: GameId;
  /** Nombre legible para la ficha de Play / App Store */
  name: string;
  /** Slug Expo / URL-friendly (sin espacios) */
  slug: string;
  /** Deep link scheme (único) */
  scheme: string;
  android: {
    /** Package name: solo [a-z0-9.] — sin guiones. Irreversible tras primera subida. */
    package: string;
  };
  ios: {
    bundleIdentifier: string;
  };
  orientation: Orientation;
  icons: GameIcons;
  /** Si el juego usa red (Colyseus, fetch de scores, etc.) */
  usesNetwork: boolean;
  /** Si el juego emite SFX / BGM */
  usesSound: boolean;
  /** ID de proyecto EAS (se rellena en Fase 4) */
  easProjectId?: string;
}

/** Type guard */
export function isGameId(value: string): value is GameId {
  return (GAME_IDS as readonly string[]).includes(value);
}
