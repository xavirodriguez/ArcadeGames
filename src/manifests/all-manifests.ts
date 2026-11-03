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

export const arkanoidManifest = m("arkanoid", "Arkanoid") as const satisfies GameManifest;
export const asteroidsManifest = m("asteroids", "Asteroids") as const satisfies GameManifest;
export const centipedeManifest = m("centipede", "Centipede") as const satisfies GameManifest;
export const echorunnerManifest = m("echorunner", "Echo Runner") as const satisfies GameManifest;
export const flappybirdManifest = m("flappybird", "Flappy Bird", { orientation: "portrait" }) as const satisfies GameManifest;
export const froggerManifest = m("frogger", "Frogger") as const satisfies GameManifest;
export const galaxianManifest = m("galaxian", "Galaxian") as const satisfies GameManifest;
export const geometrywarsManifest = m("geometrywars", "Geometry Wars") as const satisfies GameManifest;
export const hitandrunManifest = m("hitandrun", "Hit and Run") as const satisfies GameManifest;
export const outrunManifest = m("outrun", "Out Run") as const satisfies GameManifest;
export const platformerManifest = m("platformer", "Platformer") as const satisfies GameManifest;
export const pongManifest = m("pong", "Pong", { usesNetwork: true }) as const satisfies GameManifest;
export const racingManifest = m("racing", "Racing") as const satisfies GameManifest;
export const spaceInvadersManifest = m("space-invaders", "Space Invaders", { packageSuffix: "spaceinvaders" }) as const satisfies GameManifest;
export const towerDefenseManifest = m("tower-defense", "Tower Defense", { packageSuffix: "towerdefense" }) as const satisfies GameManifest;
export const verticalShmupManifest = m("vertical-shmup", "Vertical Shmup", { orientation: "portrait", packageSuffix: "verticalshmup" }) as const satisfies GameManifest;
export const campaignManifest = m("campaign", "Campaign") as const satisfies GameManifest;
export const cyoaManifest = m("cyoa", "CYOA", { orientation: "default" }) as const satisfies GameManifest;
export const blindstationManifest = m("blindstation", "Blind Station") as const satisfies GameManifest;
