import { ConfigService } from "@tiny-aster/core";
import { z } from "zod";

export interface MutatorLike {
  apply: (cfg: any) => any;
}

export type MutatorsParam = MutatorLike[] | { mutators?: MutatorLike[]; activeMutators?: MutatorLike[] } | null | undefined;

/**
 * Applies mutators sequentially to a base configuration if present, preserving
 * immutability and defaulting to a copy of baseConfig if no mutators are provided.
 *
 * @param baseConfig - The base configuration object.
 * @param mutatorsParam - Array of mutators or game options object containing `mutators` / `activeMutators`.
 * @returns Mutated configuration object.
 * @public
 */
export function applyMutators<T extends Record<string, any>>(
  baseConfig: T,
  mutatorsParam?: MutatorsParam
): T {
  let mutators: MutatorLike[] | undefined;

  if (Array.isArray(mutatorsParam)) {
    mutators = mutatorsParam;
  } else if (mutatorsParam && typeof mutatorsParam === "object") {
    mutators = mutatorsParam.mutators || mutatorsParam.activeMutators;
  }

  if (!mutators || mutators.length === 0) {
    return { ...baseConfig };
  }

  return mutators.reduce((cfg, m) => m.apply(cfg), { ...baseConfig });
}

/**
 * Validates raw configuration using Zod via `ConfigService.load` and then applies mutators.
 *
 * @param gameId - Game identifier for configuration loading.
 * @param schema - Zod schema for validating the base configuration.
 * @param rawConfig - Unvalidated raw configuration data.
 * @param mutatorsParam - Array of mutators or game options object containing `mutators` / `activeMutators`.
 * @returns Loaded and mutated configuration object.
 * @public
 */
export function loadAndMutateConfig<T extends Record<string, any>>(
  gameId: string,
  schema: z.ZodSchema<T>,
  rawConfig: unknown,
  mutatorsParam?: MutatorsParam
): T {
  const baseConfig = ConfigService.load<T>(gameId, schema, rawConfig);
  return applyMutators(baseConfig, mutatorsParam);
}
