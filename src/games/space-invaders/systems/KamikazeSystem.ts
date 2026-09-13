import { World } from "@tiny-aster/core";
import { TransformComponent, VelocityComponent, RenderComponent, Component } from "@tiny-aster/core";
import { GameStateComponent, KamikazeComponent, SpaceInvadersComponentRegistry, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { GameSystem } from "./GameSystem";

export class KamikazeSystem extends GameSystem {
  private spawnCooldown = 5000;
  private timer = 0;

  public update(world: World<SpaceInvadersComponentRegistry>, deltaTime: number): void {
    if (!this.shouldUpdate(world)) return;
    const config = this.getGameConfig(world);
    const gameState = world.getSingleton("GameState");
    if (!gameState) return;

    this.timer += deltaTime;

    const invaders = world.query("Invader");
    const totalInvaders = config.INVADER_ROWS * config.INVADER_COLS;

    // Trigger kamikazes if enough invaders are dead and cooldown passed
    if (invaders.length < totalInvaders * 0.6 && this.timer > this.spawnCooldown && gameState.kamikazesActive < 2) {
      this.timer = 0;
      this.spawnKamikaze(world, invaders);
    }

    const kamikazes = world.query("Kamikaze", "Transform", "Velocity");
    const players = world.query("Player", "Transform");
    const playerPos = players.length > 0 ? world.getComponent(players[0], "Transform") : null;

    const len = kamikazes.length;
    for (let i = 0; i < len; i++) {
      const entity = kamikazes[i];
      const kami = world.getComponent(entity, "Kamikaze")!;
      const pos = world.getComponent(entity, "Transform")!;

      if (kami.phase === "warning") {
        const nextWarning = kami.warningRemaining - deltaTime;
        const mutableKami = world.getMutableComponent(entity, "Kamikaze");
        if (nextWarning <= 0) {
          if (mutableKami) {
            mutableKami.phase = "diving";
            mutableKami.warningRemaining = 0;
          }
        } else {
          if (mutableKami) {
            mutableKami.warningRemaining = nextWarning;
          }
        }

        const vel = world.getMutableComponent(entity, "Velocity");
        if (vel) {
          vel.vx = 0;
          vel.vy = 0;
        }
      } else if (kami.phase === "diving") {
        let currentVx = 0;
        let currentVy = 0;

        const vel = world.getMutableComponent(entity, "Velocity");
        if (playerPos) {
          const dx = playerPos.x - pos.x;
          const dy = playerPos.y - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.001) {
            currentVx = (dx / dist) * kami.diveSpeed;
            currentVy = (dy / dist) * kami.diveSpeed;
          } else {
            currentVy = kami.diveSpeed;
          }
        } else {
          currentVy = kami.diveSpeed;
        }

        if (vel) {
          vel.vx = currentVx;
          vel.vy = currentVy;
        }

        const render = world.getMutableComponent(entity, "Render");
        if (render) {
          render.rotation = Math.atan2(currentVy, currentVx) + Math.PI / 2;
        }

        if (pos.y > GAME_CONFIG.SCREEN_HEIGHT - 50) {
          const mutableKami = world.getMutableComponent(entity, "Kamikaze");
          if (mutableKami) {
            mutableKami.phase = "returning";
          }
        }
      } else if (kami.phase === "returning") {
        const dx = kami.originX - pos.x;
        const dy = kami.originY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10) {
          world.getCommandBuffer().removeComponent(entity, "Kamikaze");
          world.mutateSingleton("GameState", gs => {
            gs.kamikazesActive--;
          });

          const vel = world.getMutableComponent(entity, "Velocity");
          if (vel) {
            vel.vx = 0;
            vel.vy = 0;
          }

          const render = world.getMutableComponent(entity, "Render");
          if (render) {
            render.rotation = 0;
          }
        } else {
          const vel = world.getMutableComponent(entity, "Velocity");
          if (vel) {
            vel.vx = (dx / dist) * (kami.diveSpeed * 0.5);
            vel.vy = (dy / dist) * (kami.diveSpeed * 0.5);
          }
        }
      }
    }
  }

  private spawnKamikaze(world: World<SpaceInvadersComponentRegistry>, invaders: ReadonlyArray<number>): void {
    if (invaders.length === 0) return;
    const randomIndex = world.gameplayRandom.nextInt(0, invaders.length);
    const invader = invaders[randomIndex];
    const pos = world.getComponent(invader, "Transform");

    if (pos && !world.getComponent(invader, "Kamikaze")) {
      const roll = world.gameplayRandom.next();
      const variant = roll < 0.5 ? "standard" : roll < 0.8 ? "splitter" : "trail";
      const color = variant === "standard" ? "#FF4444" : variant === "splitter" ? "#FF006E" : "#FF4444";
      const speed = variant === "standard" ? 180 : variant === "splitter" ? 130 : 100;

      world.getCommandBuffer().addComponent(invader, {
        type: "Kamikaze",
        variant,
        phase: "warning",
        warningRemaining: 0.5,
        originX: pos.x,
        originY: pos.y,
        diveSpeed: speed,
      } as KamikazeComponent);

      world.mutateComponent(invader, "Render", render => {
          render.color = color;
      });

      world.mutateSingleton("GameState", gs => {
          gs.kamikazesActive++;
      });
    }
  }
}
