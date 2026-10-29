/**
 * Theme registry and resolver for Hit & Run visual themes.
 */

import type { HitRunTheme } from "./HitRunTheme";
import { FantasyTheme } from "./fantasy/FantasyTheme";
import { SumiEVillageTheme } from "./sumi-e/SumiEVillageTheme";

export type ThemeFactory = () => HitRunTheme;

class ThemeRegistryImpl {
  private factories = new Map<string, ThemeFactory>();
  private activeThemeInstance: HitRunTheme | null = null;
  private activeThemeId = "fantasy";

  constructor() {
    // Register default themes
    this.register("fantasy", () => new FantasyTheme());
    this.register("sumi-e", () => new SumiEVillageTheme());
  }

  public register(id: string, factory: ThemeFactory): void {
    this.factories.set(id, factory);
  }

  public get(id: string): HitRunTheme {
    const factory = this.factories.get(id) ?? this.factories.get("fantasy");
    if (!factory) {
      throw new Error(`[ThemeRegistry] No theme registered for id '${id}' and fallback 'fantasy' is missing.`);
    }
    return factory();
  }

  public getActiveTheme(): HitRunTheme {
    if (!this.activeThemeInstance) {
      this.activeThemeInstance = this.get(this.activeThemeId);
    }
    return this.activeThemeInstance;
  }

  public setActiveTheme(id: string): HitRunTheme {
    if (this.activeThemeInstance) {
      this.activeThemeInstance.dispose();
      this.activeThemeInstance = null;
    }
    this.activeThemeId = id;
    this.activeThemeInstance = this.get(id);
    return this.activeThemeInstance;
  }

  public listThemes(): string[] {
    return Array.from(this.factories.keys());
  }

  public clear(): void {
    if (this.activeThemeInstance) {
      this.activeThemeInstance.dispose();
      this.activeThemeInstance = null;
    }
    this.factories.clear();
  }
}

/** Shared registry used by all Hit & Run renderers. */
export const ThemeRegistry = new ThemeRegistryImpl();

/** Resolves theme ID from URL query string (?theme=) or config or default 'fantasy'. */
export function resolveThemeIdFromConfig(
  configTheme?: string
): string {
  if (typeof window !== "undefined" && window.location) {
    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get("theme");
    if (urlTheme) return urlTheme;
  }
  return configTheme || "fantasy";
}
