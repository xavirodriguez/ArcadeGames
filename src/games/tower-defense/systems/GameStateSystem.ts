import { System, SystemPhase, World } from "@tiny-aster/core";
import type {
  TowerDefenseComponentRegistry,
  TowerDefenseEventRegistry,
  GameStateComponent,
  WaveDefinitions,
} from "../types/TowerDefenseTypes";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";

export class GameStateSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  readonly phase = SystemPhase.GameRules;
  private unsubKilled?: () => void;
  private unsubWaveCleared?: () => void;
  private bound = false;

  update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, dt: number): void {
    if (!this.bound) {
      this.bindEvents(world);
      this.bound = true;
    }

    const gs = world.getSingleton("GameState") as GameStateComponent | undefined;
    if (!gs) return;

    if (gs.lives <= 0 && gs.phase !== "game_over") {
      world.mutateSingleton("GameState", (g: GameStateComponent) => {
        g.phase = "game_over";
      });
      const bus = world.getEventBus();
      if (bus && !(world as any).isReSimulating) {
        bus.emitDeferred?.("PlaySFX", { name: "game_over" }) ?? bus.emit?.("PlaySFX", { name: "game_over" });
      }
      return;
    }

    if (gs.phase === "game_over" || gs.phase === "victory") return;

    if (gs.phase === "intermission") {
      world.mutateSingleton("GameState", (g: GameStateComponent) => {
        g.intermissionRemaining = Math.max(0, g.intermissionRemaining - dt);
        if (g.intermissionRemaining <= 0) {
          g.phase = "build";
        }
      });
    }

    const playerEntity = world.query("Player")[0];
    if (playerEntity !== undefined && gs.phase === "build") {
      const input = world.getComponent(playerEntity, "Input");
      if (input?.startWave) {
        this.beginWave(world);
        world.mutateComponent(playerEntity, "Input", (i) => {
          i.startWave = false;
        });
      }
    }
  }

  public reset(): void {
    this.unsubKilled?.();
    this.unsubWaveCleared?.();
    this.bound = false;
  }

  private bindEvents(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>): void {
    const bus = world.getEventBus();
    this.unsubKilled = bus?.on("creep:killed", (ev: { reward: number }) => {
      world.mutateSingleton("GameState", (g: GameStateComponent) => {
        g.gold += ev.reward;
        g.score += ev.reward;
      });
    });

    this.unsubWaveCleared = bus?.on("wave:cleared", () => {
      const config = world.getResource<TowerDefenseConfig>("GameConfig");
      const waves = world.getResource<WaveDefinitions>("WaveDefinitions");
      const gs = world.getSingleton("GameState") as GameStateComponent | undefined;
      if (!gs || !config || !waves) return;

      const nextWave = gs.wave + 1;
      if (nextWave >= waves.length) {
        world.mutateSingleton("GameState", (g: GameStateComponent) => {
          g.phase = "victory";
          g.wave = nextWave;
        });
      } else {
        world.mutateSingleton("GameState", (g: GameStateComponent) => {
          g.phase = "intermission";
          g.wave = nextWave;
          g.intermissionRemaining = config.INTERMISSION_DURATION;
        });
      }
    });
  }

  private beginWave(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>): void {
    world.mutateSingleton("GameState", (g: GameStateComponent) => {
      g.phase = "wave";
    });
  }
}
