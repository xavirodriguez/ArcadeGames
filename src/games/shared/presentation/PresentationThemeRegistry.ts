import type {
  PresentationCapability,
  PresentationTheme,
  PresentationThemeDefinition,
  PresentationThemeDescriptor,
  PresentationThemeResolution,
  PresentationThemeContext
} from "./PresentationContracts";

/**
 * Per-game catalogue of theme factories. Definitions are registered here;
 * renderable theme instances are created and owned by individual sessions.
 */
export class PresentationThemeRegistry<
  TSceneSnapshot,
  TEntitySnapshot,
  TFeedbackEvent,
  THudSnapshot,
  TBannerSnapshot
> {
  private readonly definitions = new Map<
    string,
    PresentationThemeDefinition<
      TSceneSnapshot,
      TEntitySnapshot,
      TFeedbackEvent,
      THudSnapshot,
      TBannerSnapshot
    >
  >();

  public constructor(private readonly fallbackThemeId: string) {
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
      TBannerSnapshot
    >
  ): void {
    this.validateDescriptor(definition.descriptor);

    if (this.definitions.has(definition.descriptor.id)) {
      throw new Error(
        "[PresentationThemeRegistry] Theme '" + definition.descriptor.id + "' is already registered."
      );
    }

    const descriptor = Object.freeze({
      ...definition.descriptor,
      capabilities: Object.freeze([...definition.descriptor.capabilities])
    });

    this.definitions.set(definition.descriptor.id, {
      descriptor,
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
    TBannerSnapshot
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
    TBannerSnapshot
  > {
    const resolution = this.resolve(requestedId);
    const theme = resolution.definition.create(context);
    this.assertCreatedThemeMatchesDefinition(resolution.definition.descriptor, theme);
    this.assertCapabilitiesMatchMethods(theme);
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

  private assertCreatedThemeMatchesDefinition(
    definition: PresentationThemeDescriptor,
    theme: PresentationTheme<
      TSceneSnapshot,
      TEntitySnapshot,
      TFeedbackEvent,
      THudSnapshot,
      TBannerSnapshot
    >
  ): void {
    if (theme.descriptor.id !== definition.id) {
      throw new Error(
        "[PresentationThemeRegistry] Factory for '" + definition.id +
        "' created '" + theme.descriptor.id + "'."
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
      TBannerSnapshot
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
