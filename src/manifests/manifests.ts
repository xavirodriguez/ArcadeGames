/**
 * Agrupa todos los manifests. Importable desde Node y desde la app.
 */
import type { GameId, GameManifest } from "./types";
import {
  arkanoidManifest,
  asteroidsManifest,
  blindstationManifest,
  campaignManifest,
  centipedeManifest,
  cyoaManifest,
  echorunnerManifest,
  flappybirdManifest,
  froggerManifest,
  galaxianManifest,
  geometrywarsManifest,
  hitandrunManifest,
  outrunManifest,
  platformerManifest,
  pongManifest,
  racingManifest,
  spaceInvadersManifest,
  towerDefenseManifest,
  verticalShmupManifest,
} from "./all-manifests";

export const MANIFESTS: Record<GameId, GameManifest> = {
  arkanoid: arkanoidManifest,
  asteroids: asteroidsManifest,
  centipede: centipedeManifest,
  echorunner: echorunnerManifest,
  flappybird: flappybirdManifest,
  frogger: froggerManifest,
  galaxian: galaxianManifest,
  geometrywars: geometrywarsManifest,
  hitandrun: hitandrunManifest,
  outrun: outrunManifest,
  platformer: platformerManifest,
  pong: pongManifest,
  racing: racingManifest,
  "space-invaders": spaceInvadersManifest,
  "tower-defense": towerDefenseManifest,
  "vertical-shmup": verticalShmupManifest,
  campaign: campaignManifest,
  cyoa: cyoaManifest,
  blindstation: blindstationManifest,
};

export function getManifest(id: GameId): GameManifest {
  return MANIFESTS[id];
}

export function getAllManifests(): GameManifest[] {
  return Object.values(MANIFESTS);
}

export * from "./types";
export * from "./all-manifests";
