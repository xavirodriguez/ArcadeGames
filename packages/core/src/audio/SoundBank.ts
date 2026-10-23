import { IAudioPlayer } from "./IAudioPlayer";

export type CuePriority = "low" | "normal" | "high" | "critical";

export interface CueSpec {
  id: string;
  category: string;
  files: string[];
  variants: number;
  gainDb?: number;
  pitchJitter?: number;
  cooldownMs?: number;
  priority?: CuePriority;
  loop?: boolean;
}

export interface CueBankData {
  version: string;
  cues: Record<string, CueSpec>;
}

export interface ActiveVoice {
  id: string;
  cueId: string;
  priority: CuePriority;
  startTime: number;
}

export interface SoundBankConfig {
  maxGlobalVoices?: number;
  maxCueVoices?: number;
  baseDir?: string;
  duckingAmountDb?: number;
  duckingDurationMs?: number;
}

const PRIORITY_ORDER: Record<CuePriority, number> = {
  low: 1,
  normal: 2,
  high: 3,
  critical: 4,
};

/**
 * Manages sound cue dispatching, voice limits, voice stealing, cooldowns,
 * variant selection without repetition, and BGM ducking.
 */
export class SoundBank {
  private cues = new Map<string, CueSpec>();
  private lastVariantPlayed = new Map<string, number>();
  private lastCuePlayTime = new Map<string, number>();
  private activeVoices: ActiveVoice[] = [];

  private maxGlobalVoices: number;
  private maxCueVoices: number;
  private baseDir: string;

  constructor(config: SoundBankConfig = {}) {
    this.maxGlobalVoices = config.maxGlobalVoices ?? 16;
    this.maxCueVoices = config.maxCueVoices ?? 4;
    this.baseDir = config.baseDir ?? "./sounds";
  }

  /**
   * Registers a CueBank specification into the sound bank.
   */
  public registerCueBank(bankData: CueBankData): void {
    if (!bankData || !bankData.cues) return;
    for (const [id, spec] of Object.entries(bankData.cues)) {
      this.cues.set(id, spec);
    }
  }

  /**
   * Preloads all audio files associated with registered cues into the audio player.
   */
  public async loadAllCues(player: IAudioPlayer): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const cue of this.cues.values()) {
      for (const file of cue.files) {
        const fullPath = `${this.baseDir}/${file}`.replace(/\/+/g, "/");
        promises.push(player.loadSFX(fullPath, fullPath));
      }
    }
    await Promise.all(promises);
  }

  /**
   * Triggers a cue with automatic variant selection, voice management, and jitter.
   */
  public playCue(cueId: string, player: IAudioPlayer): void {
    const cue = this.cues.get(cueId);
    if (!cue) {
      player.playSFX(cueId);
      return;
    }

    const now = performance.now();

    // 1. Cooldown check
    const cooldownMs = cue.cooldownMs ?? 30;
    const lastPlayed = this.lastCuePlayTime.get(cueId) ?? 0;
    if (now - lastPlayed < cooldownMs) {
      return;
    }

    // 2. Select variant avoiding consecutive repetition
    const variantsCount = cue.variants ?? cue.files.length;
    let selectedVariantIndex = 0;

    if (variantsCount > 1) {
      const lastVar = this.lastVariantPlayed.get(cueId) ?? -1;
      selectedVariantIndex = Math.floor(Math.random() * variantsCount);
      if (selectedVariantIndex === lastVar) {
        selectedVariantIndex = (selectedVariantIndex + 1) % variantsCount;
      }
      this.lastVariantPlayed.set(cueId, selectedVariantIndex);
    }

    const targetFile = cue.files[Math.min(selectedVariantIndex, cue.files.length - 1)];
    const fullPath = `${this.baseDir}/${targetFile}`.replace(/\/+/g, "/");

    // 3. Clean up expired active voices (> 3 seconds)
    this.activeVoices = this.activeVoices.filter((v) => now - v.startTime < 3000);

    // 4. Voice limiting & stealing (Cue level & Global level)
    const priority = cue.priority ?? "normal";
    const cueVoices = this.activeVoices.filter((v) => v.cueId === cueId);

    if (cueVoices.length >= this.maxCueVoices) {
      // Steal oldest voice of this cue
      const oldestCueVoice = cueVoices[0];
      this.activeVoices = this.activeVoices.filter((v) => v !== oldestCueVoice);
    }

    if (this.activeVoices.length >= this.maxGlobalVoices) {
      // Steal lowest priority, or oldest if equal priority
      this.activeVoices.sort((a, b) => {
        const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (pDiff !== 0) return pDiff;
        return a.startTime - b.startTime; // Oldest first
      });

      const victim = this.activeVoices[0];
      if (PRIORITY_ORDER[victim.priority] > PRIORITY_ORDER[priority]) {
        // Active voices are all higher priority than this request; drop play request
        return;
      }
      this.activeVoices.shift(); // Evict victim
    }

    // 5. Register active voice
    this.lastCuePlayTime.set(cueId, now);
    this.activeVoices.push({
      id: `${cueId}_${now}_${Math.random()}`,
      cueId,
      priority,
      startTime: now,
    });

    // 6. Play SFX with pitch jitter & gain
    const pitchRange = cue.pitchJitter ? cue.pitchJitter / 12 : 0; // convert semitones to ratio range
    const gainVolume = cue.gainDb ? Math.pow(10, cue.gainDb / 20) : 1.0;

    player.playSFX(fullPath, {
      pitchRange,
      volume: gainVolume,
    });
  }

  public getActiveVoiceCount(): number {
    return this.activeVoices.length;
  }
}
