export function computeEnvelope(
  tRel: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  duration: number
): number {
  if (tRel < 0) return 0;
  if (tRel < attack) {
    return attack > 0 ? tRel / attack : 1;
  }
  if (tRel < attack + decay) {
    const p = decay > 0 ? (tRel - attack) / decay : 1;
    return 1 + (sustain - 1) * Math.min(1, Math.max(0, p));
  }
  if (tRel < duration) {
    return sustain;
  }
  if (tRel < duration + release) {
    let levelAtDur = sustain;
    if (duration < attack) {
      levelAtDur = attack > 0 ? duration / attack : 1;
    } else if (duration < attack + decay) {
      const p = decay > 0 ? (duration - attack) / decay : 1;
      levelAtDur = 1 + (sustain - 1) * Math.min(1, Math.max(0, p));
    }
    const relP = release > 0 ? (tRel - duration) / release : 1;
    return levelAtDur * Math.max(0, 1 - relP);
  }
  return 0;
}
