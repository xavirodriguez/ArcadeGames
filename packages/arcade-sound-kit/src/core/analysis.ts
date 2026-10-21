export interface BandEnergies {
  subGrave: number;  // 0 - 250 Hz
  lowMid: number;    // 250 - 2000 Hz
  highMid: number;   // 2000 - 6000 Hz
  presence: number;  // 6000+ Hz
}

export interface AudioAnalysisResult {
  name: string;
  category: string;
  peak: number;
  rmsDb: number;
  lufs: number;
  dcOffset: number;
  clippedSamples: number;
  initialSilenceMs: number;
  finalSilenceMs: number;
  firstSampleDiscontinuity: number;
  lastSampleDiscontinuity: number;
  loopJump: number;
  declaredDuration: number;
  measuredDuration: number;
  durationDiffMs: number;
  spectralCentroidHz: number;
  bandEnergies: BandEnergies;
}

export interface SimilarPair {
  soundA: string;
  soundB: string;
  distance: number;
  durationDiffMs: number;
}

export function dftDirect(reInput: Float32Array, imInput: Float32Array): { re: Float32Array; im: Float32Array } {
  const N = reInput.length;
  const outRe = new Float32Array(N);
  const outIm = new Float32Array(N);

  for (let k = 0; k < N; k++) {
    let sumRe = 0;
    let sumIm = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      const cosVal = Math.cos(angle);
      const sinVal = Math.sin(angle);
      sumRe += reInput[n] * cosVal + imInput[n] * sinVal;
      sumIm += -reInput[n] * sinVal + imInput[n] * cosVal;
    }
    outRe[k] = sumRe;
    outIm[k] = sumIm;
  }

  return { re: outRe, im: outIm };
}

export function fftRadix2(re: Float32Array, im: Float32Array): void {
  const N = re.length;
  if ((N & (N - 1)) !== 0) {
    throw new Error(`FFT size must be a power of 2, got ${N}`);
  }

  // Bit reversal permutation
  let j = 0;
  for (let i = 0; i < N - 1; i++) {
    if (i < j) {
      const tempRe = re[i];
      const tempIm = im[i];
      re[i] = re[j];
      im[i] = im[j];
      re[j] = tempRe;
      im[j] = tempIm;
    }
    let k = N >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Cooley-Tukey Radix-2
  for (let len = 2; len <= N; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepRe = Math.cos(angle);
    const wStepIm = Math.sin(angle);

    for (let i = 0; i < N; i += len) {
      let wRe = 1.0;
      let wIm = 0.0;

      for (let k = 0; k < halfLen; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vIdx = i + k + halfLen;
        const vRe = re[vIdx] * wRe - im[vIdx] * wIm;
        const vIm = re[vIdx] * wIm + im[vIdx] * wRe;

        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[vIdx] = uRe - vRe;
        im[vIdx] = uIm - vIm;

        const nextWre = wRe * wStepRe - wIm * wStepIm;
        const nextWim = wRe * wStepIm + wIm * wStepRe;
        wRe = nextWre;
        wIm = nextWim;
      }
    }
  }
}

export function computePowerSpectrum(
  samples: Float32Array,
  sampleRate: number
): { freqs: Float32Array; magPower: Float32Array } {
  let N = 256;
  while (N < samples.length && N < 4096) N <<= 1;
  N = Math.min(N, 4096);

  const re = new Float32Array(N);
  const im = new Float32Array(N);
  const numSamples = Math.min(N, samples.length);

  for (let i = 0; i < numSamples; i++) {
    // Hann window
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (numSamples - 1)));
    re[i] = samples[i] * w;
  }

  fftRadix2(re, im);

  const numBins = (N >> 1) + 1;
  const freqs = new Float32Array(numBins);
  const magPower = new Float32Array(numBins);

  for (let k = 0; k < numBins; k++) {
    freqs[k] = (k * sampleRate) / N;
    magPower[k] = re[k] * re[k] + im[k] * im[k];
  }

  return { freqs, magPower };
}

export function computeSpectralCentroid(samples: Float32Array, sampleRate: number): number {
  if (samples.length === 0) return 0;
  const { freqs, magPower } = computePowerSpectrum(samples, sampleRate);

  let weightedSum = 0;
  let totalPower = 0;

  for (let i = 0; i < freqs.length; i++) {
    weightedSum += freqs[i] * magPower[i];
    totalPower += magPower[i];
  }

  return totalPower > 0 ? weightedSum / totalPower : 0;
}

export function computeBandEnergies(samples: Float32Array, sampleRate: number): BandEnergies {
  const { freqs, magPower } = computePowerSpectrum(samples, sampleRate);

  let subGrave = 0;
  let lowMid = 0;
  let highMid = 0;
  let presence = 0;

  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i];
    const p = magPower[i];

    if (f < 250) subGrave += p;
    else if (f < 2000) lowMid += p;
    else if (f < 6000) highMid += p;
    else presence += p;
  }

  const total = subGrave + lowMid + highMid + presence + 1e-12;

  return {
    subGrave: subGrave / total,
    lowMid: lowMid / total,
    highMid: highMid / total,
    presence: presence / total,
  };
}

export function computeKWeightedLoudness(samples: Float32Array, sampleRate: number): number {
  if (samples.length === 0) return -100;

  // Simple K-weighting approximation using ITU-R BS.1770 pre-filter high shelf + highpass
  // Compute mean square of filtered energy
  let sumSq = 0;
  let count = 0;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (Math.abs(s) >= 0.0001) {
      sumSq += s * s;
      count++;
    }
  }

  if (count === 0) return -100;

  const rms = Math.sqrt(sumSq / count);
  // ITU-R BS.1770 offset formula: -0.691 + 10 * log10(sumSq / N)
  const lufs = -0.691 + 10 * Math.log10(rms * rms + 1e-12);
  return Math.max(-100, Math.min(0, lufs));
}

export function analyzeAudioBuffer(
  name: string,
  category: string,
  samples: Float32Array,
  sampleRate: number,
  declaredDuration: number,
  isLoop = false
): AudioAnalysisResult {
  let peak = 0;
  let sum = 0;
  let sumSq = 0;
  let activeCount = 0;
  let clippedSamples = 0;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const abs = Math.abs(s);
    if (abs > peak) peak = abs;
    if (abs >= 0.9999) clippedSamples++;

    sum += s;
    if (abs >= 0.001) {
      sumSq += s * s;
      activeCount++;
    }
  }

  const dcOffset = samples.length > 0 ? Math.abs(sum / samples.length) : 0;
  const activeRms = activeCount > 0 ? Math.sqrt(sumSq / activeCount) : 0;
  const rmsDb = activeRms > 0 ? 20 * Math.log10(activeRms) : -100;

  let firstActive = 0;
  while (firstActive < samples.length && Math.abs(samples[firstActive]) < 0.001) {
    firstActive++;
  }
  const initialSilenceMs = (firstActive / sampleRate) * 1000;

  let lastActive = samples.length - 1;
  while (lastActive >= 0 && Math.abs(samples[lastActive]) < 0.001) {
    lastActive--;
  }
  const finalSilenceMs = lastActive >= 0 ? ((samples.length - 1 - lastActive) / sampleRate) * 1000 : 0;

  const firstSampleDiscontinuity = samples.length > 0 ? Math.abs(samples[0]) : 0;
  const lastSampleDiscontinuity = samples.length > 0 ? Math.abs(samples[samples.length - 1]) : 0;
  const loopJump = isLoop && samples.length > 0 ? Math.abs(samples[samples.length - 1] - samples[0]) : 0;

  const measuredDuration = samples.length / sampleRate;
  const durationDiffMs = (measuredDuration - declaredDuration) * 1000;

  const spectralCentroidHz = computeSpectralCentroid(samples, sampleRate);
  const bandEnergies = computeBandEnergies(samples, sampleRate);
  const lufs = computeKWeightedLoudness(samples, sampleRate);

  return {
    name,
    category,
    peak,
    rmsDb,
    lufs,
    dcOffset,
    clippedSamples,
    initialSilenceMs,
    finalSilenceMs,
    firstSampleDiscontinuity,
    lastSampleDiscontinuity,
    loopJump,
    declaredDuration,
    measuredDuration,
    durationDiffMs,
    spectralCentroidHz,
    bandEnergies,
  };
}

export function findSimilarPairs(results: AudioAnalysisResult[], threshold = 0.15): SimilarPair[] {
  const pairs: SimilarPair[] = [];

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i];
      const b = results[j];

      const durDiffMs = Math.abs((a.measuredDuration - b.measuredDuration) * 1000);
      if (durDiffMs > 200) continue;

      const dSub = a.bandEnergies.subGrave - b.bandEnergies.subGrave;
      const dLow = a.bandEnergies.lowMid - b.bandEnergies.lowMid;
      const dHigh = a.bandEnergies.highMid - b.bandEnergies.highMid;
      const dPres = a.bandEnergies.presence - b.bandEnergies.presence;

      const dist = Math.sqrt(dSub * dSub + dLow * dLow + dHigh * dHigh + dPres * dPres);

      if (dist < threshold) {
        pairs.push({
          soundA: `${a.category}/${a.name}`,
          soundB: `${b.category}/${b.name}`,
          distance: dist,
          durationDiffMs: durDiffMs,
        });
      }
    }
  }

  return pairs;
}
