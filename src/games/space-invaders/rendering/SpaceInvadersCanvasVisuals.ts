/**
 * Canvas visuals for Space Invaders — barrel re-export.
 * Split across modules to keep file sizes manageable.
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
