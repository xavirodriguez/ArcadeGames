import { EnvelopePoint } from '../types';

export function computeEnvelope(
  tRel: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  duration: number,
  curve: 'linear' | 'exp' = 'linear',
  points?: EnvelopePoint[]
): number {
  if (tRel < 0) return 0;

  if (points && points.length > 0) {
    if (tRel <= points[0].t) return points[0].level;
    if (tRel >= points[points.length - 1].t) return points[points.length - 1].level;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (tRel >= p1.t && tRel <= p2.t) {
        const span = p2.t - p1.t;
        const p = span > 0 ? (tRel - p1.t) / span : 1;
        const ptCurve = p1.curve ?? curve;

        if (ptCurve === 'exp' && p1.level > 0 && p2.level > 0) {
          const floor1 = Math.max(0.001, p1.level);
          const floor2 = Math.max(0.001, p2.level);
          return Math.exp(Math.log(floor1) * (1 - p) + Math.log(floor2) * p);
        }
        return p1.level + (p2.level - p1.level) * p;
      }
    }
  }

  if (tRel < attack) {
    return attack > 0 ? tRel / attack : 1;
  }

  if (tRel < attack + decay) {
    const p = decay > 0 ? (tRel - attack) / decay : 1;
    if (curve === 'exp') {
      const floor = Math.max(0.001, sustain);
      return Math.exp(Math.log(1.0) * (1 - p) + Math.log(floor) * p);
    }
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
      if (curve === 'exp') {
        const floor = Math.max(0.001, sustain);
        levelAtDur = Math.exp(Math.log(1.0) * (1 - p) + Math.log(floor) * p);
      } else {
        levelAtDur = 1 + (sustain - 1) * Math.min(1, Math.max(0, p));
      }
    }

    const relP = release > 0 ? (tRel - duration) / release : 1;
    if (curve === 'exp' && levelAtDur > 0.001) {
      const expVal = levelAtDur * Math.exp(relP * Math.log(0.001));
      const remaining = duration + release - tRel;
      const antiClick = remaining < 0.001 ? remaining / 0.001 : 1;
      return Math.max(0, expVal * antiClick);
    }
    return levelAtDur * Math.max(0, 1 - relP);
  }

  return 0;
}
