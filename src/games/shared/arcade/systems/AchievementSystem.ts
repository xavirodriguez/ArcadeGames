import { System, World, ComponentRegistry } from "@tiny-aster/core";
import { PersistenceService } from "../../../../services/PersistenceService";

/**
 * Interface representing a player achievement.
 * @public
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

/**
 * Shared system that orchestrates and persists cross-game achievements using EventBus.
 * @public
 */
export class AchievementSystem<TComponents extends ComponentRegistry = ComponentRegistry> extends System<TComponents> {
  private achievements: Achievement[] = [
    { id: "combo_king", name: "Rey del Combo", description: "Alcanza un combo x10", unlocked: false },
    { id: "invader_slayer", name: "Aniquilador", description: "Destruye 50 invasores", unlocked: false },
    { id: "flappy_pro", name: "As de las Alturas", description: "Pasa 10 tuberías en Flappy Bird", unlocked: false },
  ];

  private invadersKilled = 0;
  private pipesPassed = 0;

  public override onRegister(world: World<TComponents>): void {
    const eventBus = world.getEventBus() as any;
    if (eventBus) {
      // Load saved achievements from persistence
      PersistenceService.load<Record<string, boolean>>("unlocked_achievements", {}).then((stored) => {
        if (stored) {
          for (const achievement of this.achievements) {
            if (stored[achievement.id]) {
              achievement.unlocked = true;
            }
          }
        }
      }).catch(err => {
        console.error("AchievementSystem: Failed to load achievements", err);
      });

      // 1. Listen to 'si:kill' from Space Invaders
      eventBus.on("si:kill", (event: { chain: number }) => {
        if (world.isReSimulating) return;
        if (event && typeof event.chain === "number" && event.chain >= 10) {
          this.unlock(world, "combo_king");
        }
      });

      // 2. Listen to general 'entity:destroyed' (e.g. Space Invaders invaders)
      eventBus.on("entity:destroyed", (event: { type: string }) => {
        if (world.isReSimulating) return;
        if (event && event.type === "Invader") {
          this.invadersKilled++;
          if (this.invadersKilled >= 50) {
            this.unlock(world, "invader_slayer");
          }
        }
      });

      // 3. Listen to 'pipe:passed' from Flappy Bird
      eventBus.on("pipe:passed", () => {
        if (world.isReSimulating) return;
        this.pipesPassed++;
        if (this.pipesPassed >= 10) {
          this.unlock(world, "flappy_pro");
        }
      });
    }
  }

  private unlock(world: World<TComponents>, id: string): void {
    const achievement = this.achievements.find((a) => a.id === id);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;

      // Map current unlocked state and persist
      const unlockedMap: Record<string, boolean> = {};
      for (const a of this.achievements) {
        if (a.unlocked) {
          unlockedMap[a.id] = true;
        }
      }
      PersistenceService.save("unlocked_achievements", unlockedMap).catch((e) => {
        console.error("AchievementSystem: Failed to persist unlocked achievement", e);
      });

      // Notify the world / presentation layers
      const eventBus = world.getEventBus() as any;
      if (eventBus) {
        eventBus.emit("achievement:unlocked", { achievement });
      }
    }
  }

  public update(world: World<TComponents>, _deltaTime: number): void {
    // Achievements are entirely event-driven.
  }

  public override dispose(): void {}

  public getAchievements(): Achievement[] {
    return [...this.achievements];
  }
}
