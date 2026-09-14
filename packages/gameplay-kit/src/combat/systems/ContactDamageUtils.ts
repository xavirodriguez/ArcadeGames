import { World, PhysicsUtils, CoreComponentRegistry } from "@tiny-aster/core";

export interface ContactDamageConfig {
  contactDistance?: number;
  invulnerabilityDuration?: number;
  damageAmount?: number;
  hitFlashFrames?: number;
  screenShakeIntensity?: number;
  screenShakeDuration?: number;
  sfxName?: string;
}

/**
 * Updates player invulnerability timers and checks for contact damage with enemy entities.
 *
 * @param world - ECS world instance.
 * @param deltaTime - Frame delta time in seconds.
 * @param config - Optional configuration for contact damage, timers, and effects.
 * @public
 */
export function updatePlayerInvulnerabilityAndContactDamage(
  world: World<CoreComponentRegistry>,
  deltaTime: number,
  config?: ContactDamageConfig
): void {
  const contactDist = config?.contactDistance ?? 20;
  const invDuration = config?.invulnerabilityDuration ?? 1.0;
  const damageAmount = config?.damageAmount ?? 1;
  const hitFlash = config?.hitFlashFrames ?? 8;

  const players = world.query("PlatformerInput", "Health", "Transform");
  const enemies = world.query("Enemy", "Transform");

  for (let p = 0; p < players.length; p++) {
    const player = players[p];
    const pHealth = world.getComponent(player, "Health")!;
    const pTrans = world.getComponent(player, "Transform")!;

    // Handle invulnerability blink timers
    let invRemaining = pHealth.invulnerableRemaining ?? 0;
    if (invRemaining > 0) {
      invRemaining = PhysicsUtils.tickTimer(invRemaining, deltaTime);
      world.mutateComponent(player, "Health", (h) => {
        h.invulnerableRemaining = invRemaining;
      });
    }

    if (invRemaining > 0) continue;

    // Contact check with all active enemies
    let hit = false;
    for (let e = 0; e < enemies.length; e++) {
      const enemy = enemies[e];
      const eTrans = world.getComponent(enemy, "Transform")!;

      const dx = pTrans.x - eTrans.x;
      const dy = pTrans.y - eTrans.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < contactDist) {
        hit = true;
        break;
      }
    }

    if (hit) {
      world.mutateComponent(player, "Health", (h) => {
        h.current -= damageAmount;
        h.invulnerableRemaining = invDuration;
      });

      if (hitFlash > 0 && world.hasComponent(player, "Render")) {
        world.mutateComponent(player, "Render", (r) => {
          r.hitFlashFrames = hitFlash;
        });
      }

      if (config?.screenShakeIntensity) {
        const cameras = world.query("Camera2D");
        for (let c = 0; c < cameras.length; c++) {
          world.commands.addComponent(cameras[c], {
            type: "ScreenShake",
            intensity: config.screenShakeIntensity,
            duration: config.screenShakeDuration ?? 0.25,
            remaining: config.screenShakeDuration ?? 0.25
          });
        }
      }

      const audio = world.getResource<any>("AudioPlayer") || (world as any).audio;
      if (audio) {
        audio.playSFX(config?.sfxName ?? "hit");
      } else {
        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("PlaySFX", { name: config?.sfxName ?? "hit" });
        }
      }
    }
  }
}
