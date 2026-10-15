/**
 * Radix-2 Cooley-Tukey Fast Fourier Transform without external dependencies.
 */

export function fftRadix2(samples) {
  let N = 1;
  while (N < samples.length) {
    N <<= 1;
  }

  const real = new Float64Array(N);
  const imag = new Float64Array(N);

  for (let i = 0; i < samples.length; i++) {
    real[i] = samples[i];
  }

  // Bit reversal permutation
  let j = 0;
  for (let i = 0; i < N - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;

      const tempI = imag[i];
      imag[i] = imag[j];
      imag[j] = tempI;
    }
    let k = N >> 1;
    while (k >= 1 && k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Butterfly iterations
  for (let len = 2; len <= N; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < N; i += len) {
      let wR = 1.0;
      let wI = 0.0;

      for (let k = 0; k < halfLen; k++) {
        const pos1 = i + k;
        const pos2 = i + k + halfLen;

        const uR = real[pos1];
        const uI = imag[pos1];

        const tR = wR * real[pos2] - wI * imag[pos2];
        const tI = wR * imag[pos2] + wI * real[pos2];

        real[pos1] = uR + tR;
        imag[pos1] = uI + tI;
        real[pos2] = uR - tR;
        imag[pos2] = uI - tI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }

  const magnitudes = new Float64Array(N / 2);
  for (let i = 0; i < N / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }

  return { real, imag, magnitudes, N };
}

export function computePowerSpectrum(samples, sampleRate) {
  const { magnitudes, N } = fftRadix2(samples);
  const numBins = N / 2;
  const binWidth = sampleRate / N;
  const dbSpectrum = new Float64Array(numBins);

  for (let i = 0; i < numBins; i++) {
    const normMag = (magnitudes[i] * 2) / N;
    dbSpectrum[i] = 20 * Math.log10(Math.max(1e-12, normMag));
  }

  return { dbSpectrum, magnitudes, binWidth, numBins, N };
}
