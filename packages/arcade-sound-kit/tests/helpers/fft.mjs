/**
 * Radix-2 Cooley-Tukey FFT for real-valued signals without external dependencies.
 * @param {Float32Array | number[]} input
 * @returns {{ real: Float64Array, imag: Float64Array, magnitudes: Float64Array }}
 */
export function fftRadix2(input) {
  const n = input.length;
  let N = 1;
  while (N < n) {
    N <<= 1;
  }

  const real = new Float64Array(N);
  const imag = new Float64Array(N);

  for (let i = 0; i < n; i++) {
    real[i] = input[i];
  }

  let j = 0;
  for (let i = 0; i < N - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      const tempI = imag[i];
      real[i] = real[j];
      imag[i] = imag[j];
      real[j] = tempR;
      imag[j] = tempI;
    }
    let k = N >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  for (let len = 2; len <= N; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < N; i += len) {
      let wR = 1;
      let wI = 0;
      for (let k = 0; k < halfLen; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];
        const vR = real[i + k + halfLen] * wR - imag[i + k + halfLen] * wI;
        const vI = real[i + k + halfLen] * wI + imag[i + k + halfLen] * wR;

        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;
        real[i + k + halfLen] = uR - vR;
        imag[i + k + halfLen] = uI - vI;

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

  return { real, imag, magnitudes };
}
