import type { SoundRecipe, Category, ManifestEntry } from '../core/types.js';

export interface CueSpec {
  id: string;
  category: Category;
  files: string[];
  variants: number;
  gainDb?: number;
  pitchJitter?: number;
  cooldownMs?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  loop?: boolean;
}

export interface CueBank {
  version: string;
  generatedAt: string;
  cues: Record<string, CueSpec>;
}

export function generateCueBank(
  recipes: SoundRecipe[],
  manifestEntries: ManifestEntry[] = []
): CueBank {
  const cues: Record<string, CueSpec> = {};
  const manifestMap = new Map<string, ManifestEntry>();
  for (const entry of manifestEntries) {
    manifestMap.set(entry.name, entry);
  }

  for (const r of recipes) {
    const entry = manifestMap.get(r.name);
    const variants = Math.max(1, entry?.variants ?? (r.variation ? 3 : 1));
    const files: string[] = [];

    if (variants === 1) {
      files.push(`${r.category}/${r.name}.wav`);
    } else {
      for (let v = 1; v <= variants; v++) {
        files.push(`${r.category}/${r.name}_${v}.wav`);
      }
    }

    const pitchJitter = r.variation?.pitch ?? 0;
    const cooldownMs = r.duration < 0.1 ? 30 : 50;
    const priority = r.category === 'combat' ? 'high' : r.category === 'ui' ? 'low' : 'normal';

    cues[r.name] = {
      id: r.name,
      category: r.category,
      files,
      variants,
      gainDb: entry?.gainDb ?? 0,
      pitchJitter,
      cooldownMs,
      priority,
      loop: r.loop ?? false,
    };
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    cues,
  };
}

export function validateCueBank(bank: unknown): string[] {
  const errors: string[] = [];
  if (!bank || typeof bank !== 'object') {
    return ['CueBank must be a valid object'];
  }

  const b = bank as CueBank;
  if (typeof b.version !== 'string') errors.push('Missing or invalid version');
  if (!b.cues || typeof b.cues !== 'object') {
    errors.push('Missing or invalid cues object');
    return errors;
  }

  for (const [id, cue] of Object.entries(b.cues)) {
    if (typeof cue.id !== 'string') errors.push(`Cue "${id}": missing id`);
    if (!Array.isArray(cue.files) || cue.files.length === 0) {
      errors.push(`Cue "${id}": files must be a non-empty array`);
    }
    if (typeof cue.variants !== 'number' || cue.variants < 1) {
      errors.push(`Cue "${id}": variants must be a positive integer`);
    }
  }

  return errors;
}
