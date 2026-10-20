import { MusicRecipe, GenerateOptions, SoundRecipe } from '../core/types';
import { render, DEFAULT_SAMPLE_RATE } from '../core/render';
import { RNG } from '../core/random';

export interface RenderMusicResult {
  samples: Float32Array;
  sampleRate: number;
  exactDurationSeconds: number;
  blockTimeMs: number;
}

/**
 * Renders a MusicRecipe bar-by-bar across tracks and sections (intro, loopA, loopB),
 * applying seamless loop folding when recipe.loop is true (spilling release/reverb tails back into bar 1).
 */
export async function renderMusic(
  musicRecipe: MusicRecipe,
  options: GenerateOptions = {}
): Promise<RenderMusicResult> {
  const startTime = performance.now();
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const bpm = musicRecipe.bpm;
  const timeSig = musicRecipe.timeSignature ?? [4, 4];
  const beatsPerBar = timeSig[0];
  const beatUnit = timeSig[1];
  const barSeconds = beatsPerBar * (60 / bpm) * (4 / beatUnit);

  let totalBars = musicRecipe.bars;
  if (musicRecipe.sections && musicRecipe.sections.length > 0) {
    totalBars = musicRecipe.sections.reduce((sum, sec) => sum + sec.bars, 0);
  }

  const totalBarSeconds = totalBars * barSeconds;
  const exactTotalSamples = Math.round(totalBarSeconds * sampleRate);

  const baseSeed = options.seed ?? 42;
  const rng = new RNG(baseSeed);

  const tempLayers = [];

  if (musicRecipe.sections && musicRecipe.sections.length > 0) {
    let currentBarOffset = 0;
    for (let sIdx = 0; sIdx < musicRecipe.sections.length; sIdx++) {
      const section = musicRecipe.sections[sIdx];
      const sectionRng = rng.fork(`section_${section.id}`);

      for (let tIdx = 0; tIdx < section.tracks.length; tIdx++) {
        const track = section.tracks[tIdx];
        const trackRng = sectionRng.fork(`track_${tIdx}`);

        for (let b = 0; b < section.bars; b++) {
          const globalBar = currentBarOffset + b;
          const barRng = trackRng.fork(`bar_${b}`);
          const notes = track.pattern(b, barRng);
          const barStartTime = globalBar * barSeconds;

          tempLayers.push({
            ...track.layer,
            start: barStartTime,
            notes,
          });
        }
      }

      currentBarOffset += section.bars;
    }
  } else {
    for (let tIdx = 0; tIdx < musicRecipe.tracks.length; tIdx++) {
      const track = musicRecipe.tracks[tIdx];
      const trackRng = rng.fork(`track_${tIdx}`);

      for (let bar = 0; bar < musicRecipe.bars; bar++) {
        const barRng = trackRng.fork(`bar_${bar}`);
        const notes = track.pattern(bar, barRng);
        const barStartTime = bar * barSeconds;

        tempLayers.push({
          ...track.layer,
          start: barStartTime,
          notes,
        });
      }
    }
  }

  const synthesizedRecipe: SoundRecipe = {
    name: musicRecipe.name,
    category: 'progression',
    duration: totalBarSeconds,
    layers: tempLayers,
  };

  const rawBuffer = await render(synthesizedRecipe, options, rng);

  let finalBuffer = new Float32Array(exactTotalSamples);

  if (musicRecipe.loop && rawBuffer.length > exactTotalSamples) {
    // Seamless loop tail folding: fold tail spill beyond exactTotalSamples back into start
    for (let i = 0; i < exactTotalSamples; i++) {
      finalBuffer[i] = rawBuffer[i];
    }
    for (let i = exactTotalSamples; i < rawBuffer.length; i++) {
      const foldIndex = (i - exactTotalSamples) % exactTotalSamples;
      finalBuffer[foldIndex] += rawBuffer[i];
    }
  } else {
    const copyLen = Math.min(exactTotalSamples, rawBuffer.length);
    for (let i = 0; i < copyLen; i++) {
      finalBuffer[i] = rawBuffer[i];
    }
  }

  const blockTimeMs = performance.now() - startTime;

  return {
    samples: finalBuffer,
    sampleRate,
    exactDurationSeconds: totalBarSeconds,
    blockTimeMs,
  };
}
