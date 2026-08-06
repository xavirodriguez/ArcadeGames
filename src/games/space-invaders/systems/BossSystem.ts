import { System, World, HealthComponent, EventBus, TransformComponent, RenderComponent, Component, ColliderComponent, CircleShape, ShapeType, CollisionEventsComponent } from "@tiny-aster/core";
import { GameStateComponent, BossComponent, SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { FactionComponent } from "../../shared/combat/components/CombatComponents";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { createEmitter } from "@tiny-aster/core";
import { CollisionLayers } from "../../shared/types/CollisionLayers";
import { Juice } from "@tiny-aster/core";

export class BossSystem extends System<SpaceInvadersComponentRegistry> {
  private config?: SpaceInvadersConfig;

  public update(world: World<SpaceInvadersComponentRegistry>, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    const gameState = world.getSingleton("GameState");
    if (!gameState || gameState.isGameOver) return;

    const bosses = world.query("Boss", "Transform", "Render");
    bosses.forEach(entity => {
      const boss = world.getComponent(entity, "Boss")!;
      const pos = world.getComponent(entity, "Transform")!;

      world.mutateComponent(entity, "Boss", b => {
          b.timer += deltaTime;
      });

      // Simple side to side movement
      world.mutateComponent(entity, "Transform", p => {
          p.x = GAME_CONFIG.SCREEN_WIDTH / 2 + Math.sin(boss.timer / 1000) * 200;
          p.dirty = true;
      });

      // Phase changes
      world.mutateComponent(entity, "Boss", b => {
          const hpPercent = b.hp / b.maxHp;
          if (hpPercent < 0.33) b.phase = 3;
          else if (hpPercent < 0.66) b.phase = 2;
          else b.phase = 1;
      });

      // Shooting patterns
      if (Math.floor(boss.timer / 1000) % 2 === 0 && Math.floor((boss.timer - deltaTime) / 1000) % 2 !== 0) {
         // Burst effect when "shooting"
         createEmitter(world, {
            type: "shoot",
            x: pos.x,
            y: pos.y + 40,
            rate: 0,
            burst: true,
            count: 10,
            color: ["#FF00FF", "#00FFFF"],
            size: [3, 6],
            speed: [100, 200],
            angle: [0, 360],
            lifetime: [0.5, 1.0],
            loop: false
         });
      }

      if (boss.hp <= 0) {
        this.destroyBoss(world, entity);
      }
    });

  }

  private destroyBoss(world: World<SpaceInvadersComponentRegistry>, entity: number): void {
    const pos = world.getComponent(entity, "Transform")!;
    createEmitter(world, {
        type: "explosion",
        x: pos.x,
        y: pos.y,
        rate: 0,
        burst: true,
        count: 50,
        color: ["#FF00FF", "#FFFFFF", "#FFFF00"],
        size: [4, 10],
        speed: [50, 300],
        angle: [0, 360],
        lifetime: [1.0, 2.0],
        loop: false
    });
    Juice.shake(world, 10, 1000);

    world.mutateSingleton("GameState", gs => {
        gs.score += 5000;
    });

    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) eventBus.emitDeferred("si:boss_defeated" as any, {} as any);

    world.getCommandBuffer().removeEntity(entity);
  }
}
