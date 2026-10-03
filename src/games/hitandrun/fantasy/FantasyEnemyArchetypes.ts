/**
 * Fantasy enemy archetypes for belt-scroll sections.
 * Maps onto existing HitRun wave/AI pipeline via behaviorTags.
 */

import type {
  EnemyArchetypeDefinition,
  HitRunEnemyArchetypeId
} from "../waves/HitRunWaveTypes";
import { FANTASY_PALETTE } from "./FantasyPalette";

export const FANTASY_ENEMY_ARCHETYPES: Record<string, EnemyArchetypeDefinition> = {
  goblin: {
    id: "goblin",
    poolId: "enemy_goblin",
    health: 2,
    faction: "enemy",
    shape: "goblin",
    size: 12,
    color: FANTASY_PALETTE.goblin,
    speed: 75,
    behaviorTags: ["walk", "flank"]
  },
  goblin_archer: {
    id: "goblin_archer",
    poolId: "enemy_goblin_archer",
    health: 2,
    faction: "enemy",
    shape: "goblin_archer",
    size: 12,
    color: FANTASY_PALETTE.goblinDark,
    speed: 55,
    behaviorTags: ["walk", "shoot_slow", "flank"]
  },
  skeleton: {
    id: "skeleton",
    poolId: "enemy_skeleton",
    health: 4,
    faction: "enemy",
    shape: "skeleton",
    size: 14,
    color: FANTASY_PALETTE.skeleton,
    speed: 45,
    behaviorTags: ["walk", "block"]
  },
  cave_hopper: {
    id: "cave_hopper",
    poolId: "enemy_cave_hopper",
    health: 3,
    faction: "enemy",
    shape: "hopper",
    size: 13,
    color: "#7c3aed",
    speed: 90,
    behaviorTags: ["hop", "flank"]
  },
  orc_berserker: {
    id: "orc_berserker",
    poolId: "enemy_orc_berserker",
    health: 6,
    faction: "enemy",
    shape: "charger",
    size: 18,
    color: FANTASY_PALETTE.orc,
    speed: 150,
    behaviorTags: ["charge"]
  },
  dark_knight: {
    id: "dark_knight",
    poolId: "enemy_dark_knight",
    health: 16,
    faction: "enemy",
    shape: "elite",
    size: 24,
    color: FANTASY_PALETTE.orcArmor,
    speed: 40,
    behaviorTags: ["shoot_heavy", "tank", "flank"]
  },
  wraith: {
    id: "wraith",
    poolId: "enemy_wraith",
    health: 5,
    faction: "enemy",
    shape: "wraith",
    size: 16,
    color: FANTASY_PALETTE.wraith,
    speed: 70,
    behaviorTags: ["hop", "flank", "shoot_slow"]
  },
  warlord: {
    id: "warlord",
    poolId: "enemy_warlord",
    health: 40,
    faction: "enemy",
    shape: "boss",
    size: 36,
    color: FANTASY_PALETTE.boss,
    speed: 55,
    behaviorTags: ["tank", "shoot_heavy", "charge"]
  }
};

export type FantasyEnemyId = keyof typeof FANTASY_ENEMY_ARCHETYPES;

export function getFantasyArchetype(
  id: string
): EnemyArchetypeDefinition | undefined {
  return FANTASY_ENEMY_ARCHETYPES[id];
}

export const LEGACY_TO_FANTASY: Record<string, FantasyEnemyId> = {
  popcorn: "goblin",
  wall: "skeleton",
  hopper: "cave_hopper",
  charger: "orc_berserker",
  elite: "dark_knight",
  drone: "goblin"
};
