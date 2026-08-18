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
  readonly gameSpeed: number; // e.g. 0.5 to 1.0
  readonly damageMultiplier: number; // e.g. 0.0 to 1.0 (0 = invulnerable)
  readonly aimAssist: boolean;
  readonly navigationAssist: boolean;
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
