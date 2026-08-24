import { Component, CoreComponentRegistry, CoreEvents, BlueprintRegistryMap, ComboComponent } from "@tiny-aster/core";
import { DamageComponent, FactionComponent } from "../../shared/combat/components/CombatComponents";
import { SpawnDirectorComponent, WaveMemberComponent } from "../../shared/spawn/components/SpawnComponents";

/**
 * Component defining climber player physics parameters.
 */
export interface ClimberComponent extends Component {
  type: "Climber";
  jumpImpulse: number;
  lateralSpeed: number;
  maxAscentSpeed: number;
}

/**
 * Component defining vertical obstacle gaps.
 */
export interface ObstacleGapComponent extends Component {
  type: "ObstacleGap";
  gapWidth: number;
  passed: boolean;
  moveSpeedX: number;
}

/**
 * Component defining the rising hazard plasma wall.
 */
export interface PlasmaRisingWallComponent extends Component {
  type: "PlasmaRisingWall";
  ascentSpeed: number;
  acceleration: number;
}

/**
 * Player component tracking climber state.
 */
export interface PlayerComponent extends Component {
  type: "Player";
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
}

/**
 * Input component for Nebula Dash controls.
 */
export interface NebulaDashInputState {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  [key: string]: unknown;
}

export interface NebulaDashInputComponent extends Component, NebulaDashInputState {
  type: "Input";
}

/**
 * Game state component tracking player score, altitude, and session state.
 */
export interface NebulaDashStateComponent extends Component {
  type: "NebulaDashState";
  score: number;
  altitude: number;
  highScore: number;
  isGameOver: boolean;
  combo?: number;
  multiplier?: number;
  comboTimerRemaining?: number;
}

export interface NebulaDashComponentRegistry extends CoreComponentRegistry {
  Climber: ClimberComponent;
  ObstacleGap: ObstacleGapComponent;
  PlasmaRisingWall: PlasmaRisingWallComponent;
  Player: PlayerComponent;
  Input: NebulaDashInputComponent;
  NebulaDashState: NebulaDashStateComponent;
  Damage: DamageComponent;
  Faction: FactionComponent;
  SpawnDirector: SpawnDirectorComponent;
  WaveMember: WaveMemberComponent;
  Combo: ComboComponent;
}

export interface NebulaDashEventRegistry extends CoreEvents, Record<string, unknown> {
  "combat:hit": {
    targetEntity: number;
    sourceEntity: number;
    amount: number;
    remainingHealth: number;
  };
  "combat:death": {
    entity: number;
    sourceEntity: number;
  };
  "nebula:gap_passed": {
    gapEntity: number;
  };
}

export type NebulaDashBlueprintRegistry = BlueprintRegistryMap<
  NebulaDashComponentRegistry,
  NebulaDashEventRegistry
>;
