/**
 * Theme registry and resolver for Hit & Run visual themes.
 */

import type { HitRunTheme } from "./HitRunTheme";
import type { PresentationRandom } from "../../../shared/presentation/PresentationContracts";
import { FantasyTheme } from "./fantasy/FantasyTheme";
import { SumiEVillageTheme } from "./sumi-e/SumiEVillageTheme";

export interface ThemeFactoryContext {
  readonly cosmeticSeed?: number;
  readonly random?: PresentationRandom;
}

export type ThemeFactory = (context?: ThemeFactoryContext) => HitRunTheme;

/** Global catalogue only. Concrete theme instances belong to a game session. */
class ThemeRegistryImpl {
  private factories = new Map<string, ThemeFactory>();

  constructor() {
    // Register default themes
    this.register("fantasy", () => new FantasyTheme());
    this.register("sumi-e", (context) => new SumiEVillageTheme(context?.random, context?.cosmeticSeed));
  }

  public register(id: string, factory: ThemeFactory): void {
    this.factories.set(id, factory);
  }

  public get(id: string, context?: ThemeFactoryContext): HitRunTheme {
    const factory = this.factories.get(id) ?? this.factories.get("fantasy");
    if (!factory) {
      throw new Error(`[ThemeRegistry] No theme registered for id '${id}' and fallback 'fantasy' is missing.`);
    }
    return factory(context);
  }

  public listThemes(): string[] {
    return Array.from(this.factories.keys());
  }

  public clear(): void {
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
