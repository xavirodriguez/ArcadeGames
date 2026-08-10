import { CoreComponentRegistry, CoreEvents } from "@tiny-aster/core";
import { LootTableComponent, PowerUpComponent, ComboComponent } from "../../shared/arcade";
import { DamageComponent, FactionComponent } from "../../shared/combat/components/CombatComponents";
import {
  GameStateComponent,
  InputComponent,
  UfoComponent
} from "./AsteroidTypes";

/** @public */
export interface AsteroidsComponentRegistry extends CoreComponentRegistry {
  LootTable: LootTableComponent;
  PowerUp: PowerUpComponent;
  Combo: ComboComponent;
  GameState: GameStateComponent;
  Input: InputComponent;
  Ufo: UfoComponent;
  Asteroid: { type: "Asteroid"; size: string };
  Ship: {
    type: "Ship";
    sessionId: string;
    shootCooldownRemaining: number;
    hyperspaceCooldownRemaining?: number;
    hyperspacePrepTime?: number;
    hyperspacePreviewX?: number;
    hyperspacePreviewY?: number;
  };
  Bullet: { type: "Bullet"; ownerId?: string };
  LocalPlayer: { type: "LocalPlayer" };
  RemotePlayer: { type: "RemotePlayer"; sessionId: string };
  PlayerScore: { type: "PlayerScore"; score: number };
  Damage: DamageComponent;
  Faction: FactionComponent;
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

/** @public */
export interface AsteroidsBlueprintMap extends Record<string, import("@tiny-aster/core").BlueprintDefinition<AsteroidsComponentRegistry, any, any>> {
  ship: import("@tiny-aster/core").BlueprintDefinition<AsteroidsComponentRegistry, AsteroidsEventRegistry, { x: number; y: number }>;
  bullet: import("@tiny-aster/core").BlueprintDefinition<AsteroidsComponentRegistry, AsteroidsEventRegistry, { x: number; y: number; vx: number; vy: number; ownerId?: string; ttl?: number }>;
  asteroid: import("@tiny-aster/core").BlueprintDefinition<AsteroidsComponentRegistry, AsteroidsEventRegistry, { x: number; y: number; size: string; vx?: number; vy?: number; angularVelocity?: number }>;
}
