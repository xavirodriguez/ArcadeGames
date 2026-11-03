/**
 * Manifests individuales (sin imports de RN / Skia / componentes).
 * Cada uno usa `as const satisfies GameManifest`.
 */
import type { GameManifest } from "./types";

function m(
  id: GameManifest["id"],
  name: string,
  opts: Partial<Pick<GameManifest, "orientation" | "usesNetwork" | "usesSound">> & {
    packageSuffix?: string;
  } = {}
): GameManifest {
  const slug = id;
  const pkg = opts.packageSuffix ?? id.replace(/-/g, "");
  return {
    id,
    name,
    slug,
    scheme: `tinyaster-${pkg}`,
    android: { package: `com.ensable.${pkg}` },
    ios: { bundleIdentifier: `com.ensable.${pkg}` },
    orientation: opts.orientation ?? "landscape",
    icons: {
      icon: `./assets/icons/${id}.png`,
      adaptiveIcon: `./assets/icons/${id}-adaptive.png`,
      splash: `./assets/icons/${id}-splash.png`,
    },
    usesNetwork: opts.usesNetwork ?? false,
    usesSound: opts.usesSound ?? true,
  };
}

export const arkanoidManifest: GameManifest = m("arkanoid", "Arkanoid");
export const asteroidsManifest: GameManifest = m("asteroids", "Asteroids");
export const centipedeManifest: GameManifest = m("centipede", "Centipede");
export const echorunnerManifest: GameManifest = m("echorunner", "Echo Runner");
export const flappybirdManifest: GameManifest = m("flappybird", "Flappy Bird", { orientation: "portrait" });
export const froggerManifest: GameManifest = m("frogger", "Frogger");
export const galaxianManifest: GameManifest = m("galaxian", "Galaxian");
export const geometrywarsManifest: GameManifest = m("geometrywars", "Geometry Wars");
export const hitandrunManifest: GameManifest = m("hitandrun", "Hit and Run");
export const outrunManifest: GameManifest = m("outrun", "Out Run");
export const platformerManifest: GameManifest = m("platformer", "Platformer");
export const pongManifest: GameManifest = m("pong", "Pong", { usesNetwork: true });
export const racingManifest: GameManifest = m("racing", "Racing");
export const spaceInvadersManifest: GameManifest = m("space-invaders", "Space Invaders", { packageSuffix: "spaceinvaders" });
export const towerDefenseManifest: GameManifest = m("tower-defense", "Tower Defense", { packageSuffix: "towerdefense" });
export const verticalShmupManifest: GameManifest = m("vertical-shmup", "Vertical Shmup", { orientation: "portrait", packageSuffix: "verticalshmup" });
export const campaignManifest: GameManifest = m("campaign", "Campaign");
export const cyoaManifest: GameManifest = m("cyoa", "CYOA", { orientation: "default" });
export const blindstationManifest: GameManifest = m("blindstation", "Blind Station");
