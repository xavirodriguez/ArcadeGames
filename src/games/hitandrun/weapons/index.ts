export type {
  HitRunWeaponId,
  HitRunWeaponDefinition,
  HitRunBulletParams,
  ExplosivePayloadComponent,
  CombatExplosionPayload,
  HitRunWeaponState
} from "./HitRunWeaponTypes";

export {
  HIT_RUN_WEAPON_CATALOG,
  getWeaponDefinition
} from "./HitRunWeaponCatalog";

export {
  HitRunBulletPool,
  registerPlayerBulletPool,
  HIT_RUN_BULLET_LAYER,
  HIT_RUN_ENEMY_LAYER
} from "./HitRunBulletPool";

export { fireWeapon, applyRecoil } from "./fireWeapon";
export type { FireWeaponArgs } from "./fireWeapon";

export { HitRunWeaponSystem } from "./HitRunWeaponSystem";
export { HitRunExplosionSystem } from "./HitRunExplosionSystem";
export { registerHitRunWeapons } from "./registerHitRunWeapons";
