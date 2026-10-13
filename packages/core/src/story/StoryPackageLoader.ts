import { IAssetProvider, AssetLoader } from "../assets/AssetLoader";
import { StoryPackage } from "./StoryTypes";
import { StoryMigrations } from "./StoryMigrations";
import { StoryPackageValidator, StoryPackageValidationResult } from "./StoryPackageValidator";

/**
 * Categorization of root causes for StoryPackage loading failures.
 * @public
 */
export type StoryPackageLoadErrorCause = "fetch" | "migration" | "validation";

/**
 * Custom error thrown when loading, migrating, or validating a `StoryPackage` fails.
 *
 * @public
 */
export class StoryPackageLoadError extends Error {
  /**
   * Identifies the stage in the loading pipeline where failure occurred.
   */
  public readonly causeType: StoryPackageLoadErrorCause;

  /**
   * Detailed package validation result if failure occurred during validation.
   */
  public readonly validationResult?: StoryPackageValidationResult;

  /**
   * Constructs a new `StoryPackageLoadError`.
   *
   * @param message - Human readable error description.
   * @param causeType - Error origin stage ("fetch", "migration", or "validation").
   * @param validationResult - Optional validation details when cause is "validation".
   */
  constructor(
    message: string,
    causeType: StoryPackageLoadErrorCause,
    validationResult?: StoryPackageValidationResult
  ) {
    super(message);
    this.name = "StoryPackageLoadError";
    this.causeType = causeType;
    this.validationResult = validationResult;
  }
}

/**
 * Result object produced by a successful `StoryPackageLoader.load()` operation.
 * @public
 */
export interface StoryPackageLoadResult {
  /** Normalized and migrated StoryPackage definition. */
  package: StoryPackage;
  /** Full validation result containing errors and non-critical warnings. */
  validation: StoryPackageValidationResult;
}

/**
 * Asynchronous loader that fetches, normalizes, migrates, and validates JSON `StoryPackage` definitions.
 *
 * @remarks
 * Decoupled from direct network `fetch` by consuming an injected {@link IAssetProvider} or {@link AssetLoader}.
 * Handles cross-platform response discrepancies (raw JSON, stringified JSON, Expo Asset objects),
 * applies schema migrations via {@link StoryMigrations}, and performs integrity checks via {@link StoryPackageValidator}.
 *
 * @public
 */
export class StoryPackageLoader {
  private provider?: IAssetProvider;

  /**
   * Creates a new `StoryPackageLoader` instance.
   *
   * @param providerOrLoader - An optional {@link IAssetProvider} or {@link AssetLoader} instance.
   */
  constructor(providerOrLoader?: IAssetProvider | AssetLoader) {
    if (providerOrLoader) {
      if (providerOrLoader instanceof AssetLoader) {
        this.provider = providerOrLoader.getProvider();
      } else {
        this.provider = providerOrLoader;
      }
    }
  }

  /**
   * Sets or replaces the active platform asset provider.
   *
   * @param provider - Platform resource provider implementing {@link IAssetProvider}.
   */
  public setProvider(provider: IAssetProvider): void {
    this.provider = provider;
  }

  /**
   * Asynchronously loads, normalizes, migrates, and validates a `StoryPackage` from a path or object.
   *
   * @param source - Relative/absolute path string, JSON string, or raw data object representing a `StoryPackage`.
   * @returns Promise resolving to the loaded `StoryPackage` and validation metadata.
   * @throws {@link StoryPackageLoadError} if fetching, migrating, or validating the package fails.
   */
  public async load(source: string | unknown): Promise<StoryPackageLoadResult> {
    let raw: unknown = source;

    // 1. Fetching & Normalization phase
    if (typeof source === "string") {
      const trimmed = source.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
          raw = JSON.parse(trimmed);
        } catch (err) {
          throw new StoryPackageLoadError(
            `Failed to parse JSON string source: ${err instanceof Error ? err.message : String(err)}`,
            "fetch"
          );
        }
      } else {
        if (!this.provider) {
          throw new StoryPackageLoadError(
            `Cannot load story package path '${source}': No asset provider registered.`,
            "fetch"
          );
        }

        try {
          if (this.provider.load) {
            raw = await this.provider.load(source);
          } else {
            throw new StoryPackageLoadError(
              `Asset provider does not support load() method for path '${source}'.`,
              "fetch"
            );
          }
        } catch (err) {
          if (err instanceof StoryPackageLoadError) throw err;
          throw new StoryPackageLoadError(
            `Asset provider failed to load story package from '${source}': ${err instanceof Error ? err.message : String(err)}`,
            "fetch"
          );
        }
      }
    }

    // Normalizing stringified response from provider
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch (err) {
        throw new StoryPackageLoadError(
          `Failed to parse JSON response from provider: ${err instanceof Error ? err.message : String(err)}`,
          "fetch"
        );
      }
    }

    // Normalizing Expo Asset or wrapper object
    if (raw && typeof raw === "object") {
      const rawObj = raw as Record<string, unknown>;

      // Check if it's an Expo Asset or wrapper containing uri/localUri and no manifest/nodes
      if (!rawObj.manifest && !rawObj.nodes && (typeof rawObj.localUri === "string" || typeof rawObj.uri === "string")) {
        const uri = (rawObj.localUri || rawObj.uri) as string;
        if (typeof fetch !== "undefined") {
          try {
            const res = await fetch(uri);
            raw = await res.json();
          } catch (err) {
            throw new StoryPackageLoadError(
              `Failed to fetch JSON content from asset URI '${uri}': ${err instanceof Error ? err.message : String(err)}`,
              "fetch"
            );
          }
        } else {
          throw new StoryPackageLoadError(
            `Asset wrapper detected with URI '${uri}' but global fetch is unavailable.`,
            "fetch"
          );
        }
      }
    }

    // Validate raw content existence
    if (!raw || typeof raw !== "object" || Object.keys(raw as object).length === 0) {
      throw new StoryPackageLoadError(
        "Story package content is empty, null, or invalid object.",
        "fetch"
      );
    }

    // 2. Migration phase
    let pkg: StoryPackage;
    try {
      pkg = StoryMigrations.migrateStoryPackage(raw);
    } catch (err) {
      throw new StoryPackageLoadError(
        `Failed to migrate story package schema: ${err instanceof Error ? err.message : String(err)}`,
        "migration"
      );
    }

    // 3. Validation phase (StoryPackageValidator delegates to StoryGraphValidator per graph)
    const validation = StoryPackageValidator.validate(pkg);
    if (!validation.valid || validation.errors.length > 0) {
      throw new StoryPackageLoadError(
        `Story package validation failed with ${validation.errors.length} error(s): ${validation.errors.join("; ")}`,
        "validation",
        validation
      );
    }

    return {
      package: pkg,
      validation
    };
  }
}
