/**
 * Combo extension on top of existing MeleeAttack phases.
 * jab → jab → finisher, plus throw and special (arcane burst).
 */

import type { Component } from "@tiny-aster/core";
import {
  DEFAULT_MELEE_ATTACK_CONFIG,
  type MeleeAttackConfig
} from "./MeleeAttackTypes";

export type ComboStep = "jab1" | "jab2" | "finisher" | "throw" | "special";

export interface ComboMeleeConfig {
  chainWindowSeconds: number;
  jab1: MeleeAttackConfig;
  jab2: MeleeAttackConfig;
  finisher: MeleeAttackConfig;
  throwRange: number;
  throwDamage: number;
  throwKnockbackX: number;
  throwKnockbackY: number;
  throwIFramesSeconds: number;
  specialDamage: number;
  specialRadius: number;
  specialHealthCost: number;
  specialIFramesSeconds: number;
}

export const DEFAULT_COMBO_MELEE_CONFIG: ComboMeleeConfig = {
  chainWindowSeconds: 0.45,
  jab1: {
    ...DEFAULT_MELEE_ATTACK_CONFIG,
    startupSeconds: 0.05,
    activeSeconds: 0.08,
    recoverySeconds: 0.12,
    damage: 1,
    hitboxWidth: 26,
    hitboxHeight: 18,
    hitboxOffsetX: 20,
    halfDepth: 20,
    knockbackX: 120,
    knockbackY: 100
  },
  jab2: {
    ...DEFAULT_MELEE_ATTACK_CONFIG,
    startupSeconds: 0.05,
    activeSeconds: 0.09,
    recoverySeconds: 0.14,
    damage: 1,
    hitboxWidth: 28,
    hitboxHeight: 20,
    hitboxOffsetX: 22,
    halfDepth: 20,
    knockbackX: 140,
    knockbackY: 120
  },
  finisher: {
    ...DEFAULT_MELEE_ATTACK_CONFIG,
    startupSeconds: 0.08,
    activeSeconds: 0.12,
    recoverySeconds: 0.22,
    damage: 3,
    hitboxWidth: 34,
    hitboxHeight: 24,
    hitboxOffsetX: 26,
    halfDepth: 22,
    knockbackX: 260,
    knockbackY: 200
  },
  throwRange: 28,
  throwDamage: 2,
  throwKnockbackX: 320,
  throwKnockbackY: 220,
  throwIFramesSeconds: 0.35,
  specialDamage: 4,
  specialRadius: 72,
  specialHealthCost: 1,
  specialIFramesSeconds: 0.4
};

export interface ComboMeleeComponent extends Component {
  type: "ComboMelee";
  chainStep: number;
  chainTimer: number;
  facing: number;
  activeStep: ComboStep | "idle";
}

export const COMBO_MELEE_CONFIG_RESOURCE = "ComboMeleeConfig";
