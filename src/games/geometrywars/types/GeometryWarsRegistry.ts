import { CoreComponentRegistry, Component, BlueprintRegistryMap } from "@tiny-aster/core";
import { DamageComponent, FactionComponent } from "../../shared/combat/components/CombatComponents";

/**
 * State component containing overall score, lives, current wave, and game-over status.
 */
export interface GeometryWarsStateComponent extends Component {
  type: "GeometryWarsState";
  score: number;
  lives: number;
  bombs: number;
  wave: number;
  isGameOver: boolean;
  gameTime: number;
}

/**
 * AimComponent represents the current twin-stick pointing vector and firing trigger.
 */
export interface AimComponent extends Component {
  type: "Aim";
  aimX: number;
  aimY: number;
  isFiring: boolean;
}

/**
 * Player component tracking ship-specific state.
 */
export interface PlayerComponent extends Component {
  type: "Player";
  fireCooldownRemaining: number;
  invulnRemaining: number;
  moveX: number;
  moveY: number;
}

/**
 * Registry containing all components used in Geometry Wars.
 * @public
 */
export interface GeometryWarsComponentRegistry extends CoreComponentRegistry {
  GeometryWarsState: GeometryWarsStateComponent;
  Aim: AimComponent;
  Player: PlayerComponent;
  Damage: DamageComponent;
  Faction: FactionComponent;
}

/**
 * Event Registry for Geometry Wars.
 * @public
 */
export interface GeometryWarsEventRegistry extends Record<string, any> {
  "combat:hit": {
    targetEntity: number;
    sourceEntity: number;
    amount: number;
    remainingHealth: number;
    category?: string;
  };
  "combat:death": {
    entity: number;
    sourceEntity: number;
    category?: string;
  };
}

/**
 * Blueprints map for spawning standardized entity archetypes.
 * @public
 */
export type GeometryWarsBlueprintRegistry = BlueprintRegistryMap<
  GeometryWarsComponentRegistry,
  GeometryWarsEventRegistry
>;
