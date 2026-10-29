/** Shared identity contracts for separating appearance from rules. */
export interface ThemeModuleDescriptor {
  readonly id: string;
  readonly displayName: string;
}

/** Gameplay modules deliberately expose no renderer API. */
export interface GameplayModDescriptor {
  readonly id: string;
}

/** Optional pairing of presentation and gameplay, plus an existing concept-pack identifier. */
export interface AestheticBundle<
  TTheme extends ThemeModuleDescriptor,
  TGameplay extends GameplayModDescriptor,
  TConceptPack = unknown
> {
  readonly id: string;
  readonly theme: TTheme;
  readonly gameplay: TGameplay;
  readonly conceptPack?: TConceptPack;
}
