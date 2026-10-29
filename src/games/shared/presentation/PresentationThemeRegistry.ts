import type {
  PresentationCapability,
  PresentationTheme,
  PresentationThemeDefinition,
  PresentationThemeDescriptor,
  PresentationThemeResolution,
  PresentationThemeContext,
  PresentationThemeTokens
} from "./PresentationContracts";

/**
 * Per-game catalogue of theme factories.
 * Definitions and tokens live here; each session creates and owns its own instance.
 */
export class PresentationThemeRegistry<
  TSceneSnapshot,
  TEntitySnapshot,
  TFeedbackEvent,
  THudSnapshot,
  TBannerSnapshot,
  TCustomTokens extends object = object
> {
  private readonly definitions = new Map<
    string,
    PresentationThemeDefinition<
      TSceneSnapshot,
      TEntitySnapshot,
      TFeedbackEvent,
      THudSnapshot,
      TBannerSnapshot,
      TCustomTokens
    >
  >();

  public constructor(
    private readonly gameId: string,
    private readonly fallbackThemeId: string
  ) {
    if (gameId.trim().length === 0) {
      throw new Error("[PresentationThemeRegistry] gameId must not be empty.");
    }
    if (fallbackThemeId.trim().length === 0) {
      throw new Error("[PresentationThemeRegistry] fallbackThemeId must not be empty.");
    }
  }

  public register(
    definition: PresentationThemeDefinition<
      TSceneSnapshot,
      TEntitySnapshot,
      TFeedbackEvent,
      THudSnapshot,
      TBannerSnapshot,
      TCustomTokens
    >
  ): void {
    this.validateDescriptor(definition.descriptor);
    this.validateTokens(definition.tokens);

    if (this.definitions.has(definition.descriptor.id)) {
      throw new Error(
        "[PresentationThemeRegistry] Theme '" + definition.descriptor.id + "' is already registered."
      );
    }

    const descriptor = Object.freeze({
      ...definition.descriptor,
      capabilities: Object.freeze([...definition.descriptor.capabilities])
    });
    const tokens = Object.freeze({
      colors: Object.freeze({ ...definition.tokens.colors }),
      typography: Object.freeze({ ...definition.tokens.typography }),
      layout: Object.freeze({
        spacing: Object.freeze({ ...definition.tokens.layout.spacing }),
        radius: Object.freeze({ ...definition.tokens.layout.radius })
      }),
      custom: definition.tokens.custom
    }) as PresentationThemeTokens<TCustomTokens>;

    this.definitions.set(definition.descriptor.id, {
      descriptor,
      tokens,
      create: definition.create
    });
  }

  public list(): ReadonlyArray<PresentationThemeDescriptor> {
    return Array.from(this.definitions.values(), ({ descriptor }) => ({
      ...descriptor,
      capabilities: [...descriptor.capabilities]
    }));
  }

  public resolve(
    requestedId?: string
  ): PresentationThemeResolution<
    TSceneSnapshot,
    TEntitySnapshot,
    TFeedbackEvent,
    THudSnapshot,
    TBannerSnapshot,
    TCustomTokens
  > {
    const requested = requestedId ?? this.fallbackThemeId;
    const requestedDefinition = this.definitions.get(requested);

    if (requestedDefinition) {
      return {
        requestedId: requested,
        resolvedId: requestedDefinition.descriptor.id,
        usedFallback: false,
        definition: requestedDefinition
      };
    }

    const fallbackDefinition = this.definitions.get(this.fallbackThemeId);
    if (!fallbackDefinition) {
      throw new Error(
        "[PresentationThemeRegistry] Theme '" + requested +
        "' is not registered and fallback '" + this.fallbackThemeId + "' is missing."
      );
    }

    return {
      requestedId: requested,
      resolvedId: fallbackDefinition.descriptor.id,
      usedFallback: true,
      definition: fallbackDefinition
    };
  }

  public create(
    requestedId: string | undefined,
    context: PresentationThemeContext
  ): PresentationTheme<
    TSceneSnapshot,
    TEntitySnapshot,
    TFeedbackEvent,
    THudSnapshot,
    TBannerSnapshot,
    TCustomTokens
  > {
    if (context.gameId !== this.gameId) {
      throw new Error(
        "[PresentationThemeRegistry] Registry for game '" + this.gameId +
        "' cannot create a theme for game '" + context.gameId + "'."
      );
    }

    const resolution = this.resolve(requestedId);
    const theme = resolution.definition.create(context);

    try {
      this.assertCreatedThemeMatchesDefinition(resolution.definition.descriptor, theme);
      this.assertCapabilitiesMatchMethods(theme);
    } catch (error) {
      try {
        theme.dispose();
      } catch {
        // Preserve the contract-validation error if cleanup itself also fails.
      }
      throw error;
    }

    return theme;
  }

  private validateDescriptor(descriptor: PresentationThemeDescriptor): void {
    if (descriptor.id.trim().length === 0) {
      throw new Error("[PresentationThemeRegistry] Theme id must not be empty.");
    }
    if (descriptor.displayName.trim().length === 0) {
      throw new Error(
        "[PresentationThemeRegistry] Theme '" + descriptor.id + "' needs a displayName."
      );
    }

    const uniqueCapabilities = new Set<PresentationCapability>(descriptor.capabilities);
    if (uniqueCapabilities.size !== descriptor.capabilities.length) {
      throw new Error(
        "[PresentationThemeRegistry] Theme '" + descriptor.id + "' declares duplicate capabilities."
      );
    }
  }

  private validateTokens(tokens: PresentationThemeTokens<TCustomTokens>): void {
    const colors = [
      tokens.colors.background,
      tokens.colors.surface,
      tokens.colors.textPrimary,
      tokens.colors.textSecondary,
      tokens.colors.accent,
      tokens.colors.player,
      tokens.colors.threat,
      tokens.colors.reward,
      tokens.colors.danger,
      tokens.colors.success,
      tokens.colors.warning,
      tokens.colors.outline
    ];
    if (colors.some((color) => color.trim().length === 0)) {
      throw new Error("[PresentationThemeRegistry] Theme color tokens must not be empty.");
    }

    const fonts = [
      tokens.typography.display,
      tokens.typography.body,
      tokens.typography.monospace
    ];
    if (fonts.some((font) => font.trim().length === 0)) {
      throw new Error("[PresentationThemeRegistry] Theme typography tokens must not be empty.");
    }

    const spacing = [
      tokens.layout.spacing.xs,
      tokens.layout.spacing.sm,
      tokens.layout.spacing.md,
      tokens.layout.spacing.lg,
      tokens.layout.spacing.xl
    ];
    const radii = [
      tokens.layout.radius.sm,
      tokens.layout.radius.md,
      tokens.layout.radius.lg,
      tokens.layout.radius.pill
    ];
    if (spacing.concat(radii).some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error("[PresentationThemeRegistry] Theme layout tokens must be finite and non-negative.");
    }
  }

  private assertCreatedThemeMatchesDefinition(
    definition: PresentationThemeDescriptor,
    theme: PresentationTheme<
      TSceneSnapshot,
      TEntitySnapshot,
      TFeedbackEvent,
      THudSnapshot,
      TBannerSnapshot,
      TCustomTokens
    >
  ): void {
    if (theme.descriptor.id !== definition.id || theme.descriptor.displayName !== definition.displayName) {
      throw new Error(
        "[PresentationThemeRegistry] Factory for '" + definition.id +
        "' returned descriptor '" + theme.descriptor.id + "'."
      );
    }

    const declared = [...definition.capabilities].sort();
    const actual = [...theme.descriptor.capabilities].sort();
    if (declared.length !== actual.length || declared.some((capability, index) => capability !== actual[index])) {
      throw new Error(
        "[PresentationThemeRegistry] Factory for '" + definition.id + "' returned a different capability set."
      );
    }
  }

  private assertCapabilitiesMatchMethods(
    theme: PresentationTheme<
      TSceneSnapshot,
      TEntitySnapshot,
      TFeedbackEvent,
      THudSnapshot,
      TBannerSnapshot,
      TCustomTokens
    >
  ): void {
    const checks: ReadonlyArray<readonly [PresentationCapability, boolean]> = [
      ["backdrop", typeof theme.renderBackdrop === "function"],
      ["ground-shadow", typeof theme.renderGroundShadow === "function"],
      ["entity", typeof theme.renderEntity === "function"],
      ["projectile", typeof theme.renderProjectile === "function"],
      ["feedback", typeof theme.renderFeedback === "function"],
      ["hud", typeof theme.renderHud === "function"],
      ["banner", typeof theme.renderBanner === "function"]
    ];

    for (const [capability, hasMethod] of checks) {
      const isDeclared = theme.descriptor.capabilities.includes(capability);
      if (isDeclared !== hasMethod) {
        throw new Error(
          "[PresentationThemeRegistry] Theme '" + theme.descriptor.id +
          "' must declare capability '" + capability +
          "' exactly when its matching method is implemented."
        );
      }
    }
  }
}
