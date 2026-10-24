/**
 * Canvas visuals for Space Invaders — barrel re-export.
 * A: explosion, player, invader
 * B: bullet, boss, shield (island customGeom), particle, shake
 */
export {
  EXPLOSION_PARTICLE_POOL,
  spawnLayeredExplosion,
  updateExplosionParticles,
  drawExplosionParticlesCanvas,
  drawExplosionBackgroundEffect,
  drawSpaceInvadersPlayer,
  drawSpaceInvadersInvader,
} from "./SpaceInvadersCanvasVisualsA";

export {
  drawSpaceInvadersBullet,
  drawSpaceInvadersBoss,
  drawSpaceInvadersShield,
  drawSpaceInvadersParticle,
  spaceInvadersScreenShakeEffect,
} from "./SpaceInvadersCanvasVisualsB";
