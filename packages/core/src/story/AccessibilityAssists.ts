/**
 * Explicit player accessibility configuration.
 *
 * @remarks
 * Accessibility assists are explicit user options that do NOT inflict narrative penalties
 * or invalidate achievements.
 *
 * @public
 */
export interface AccessibilityAssistsConfig {
  /** Game speed scaling factor (e.g. 0.5 to 1.0). */
  readonly gameSpeed: number;
  /** Damage multiplier applied to incoming player damage (e.g. 0.0 for invulnerability to 1.0). */
  readonly damageMultiplier: number;
  /** Whether aim assistance targeting lock is enabled. */
  readonly aimAssist: boolean;
  /** Whether navigation assistance markers are enabled. */
  readonly navigationAssist: boolean;
  /** Whether automatic weapon firing is enabled. */
  readonly autoFire: boolean;
}

/**
 * Default accessibility options.
 *
 * @public
 */
export const DEFAULT_ACCESSIBILITY_ASSISTS: AccessibilityAssistsConfig = {
  gameSpeed: 1.0,
  damageMultiplier: 1.0,
  aimAssist: false,
  navigationAssist: false,
  autoFire: false
};
