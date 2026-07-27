import { CoreComponentRegistry, CoreEvents, LootTableComponent, PowerUpComponent } from "@tiny-aster/core";
import {
  GameStateComponent,
  InputComponent,
  UfoComponent
} from "./AsteroidTypes";

/** @public */
export interface AsteroidsComponentRegistry extends CoreComponentRegistry {
  LootTable: LootTableComponent;
  PowerUp: PowerUpComponent;
  GameState: GameStateComponent;
  Input: InputComponent;
  Ufo: UfoComponent;
  Asteroid: { type: "Asteroid"; size: string };
  Ship: { type: "Ship"; sessionId: string; shootCooldownRemaining: number };
  Bullet: { type: "Bullet"; ownerId?: string };
  LocalPlayer: { type: "LocalPlayer" };
  RemotePlayer: { type: "RemotePlayer"; sessionId: string };
  PlayerScore: { type: "PlayerScore"; score: number };
}

/** @public */
export interface AsteroidsEventRegistry extends CoreEvents, Record<string, unknown> {
  "game:start": { seed: number };
  "game:over": { score: number; level: number };
  "ship:destroyed": { entity: number };
  "asteroid:destroyed": { entity: number; size: "large" | "medium" | "small" };
  "ufo:spawned": { entity: number };
  "score:changed": { newScore: number; delta: number };
}
