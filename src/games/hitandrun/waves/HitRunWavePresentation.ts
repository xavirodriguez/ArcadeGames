/**
 * Presentation resources for wave telegraphs + CLEAR / banner messages.
 */

export interface WaveTelegraphMarker {
  x: number;
  y: number;
  /** Seconds until spawn (counts down). */
  remaining: number;
  /** Total lead time (for pulse animation). */
  lead: number;
}

export interface WaveBannerState {
  text: string;
  remaining: number;
  /** Optional subtitle */
  sub?: string;
}

export const WAVE_TELEGRAPHS_RESOURCE = "WaveTelegraphs";
export const WAVE_BANNER_RESOURCE = "WaveBanner";

export function pushTelegraph(
  list: WaveTelegraphMarker[],
  x: number,
  y: number,
  lead = 0.55
): void {
  // Dedupe near-same positions
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (Math.abs(m.x - x) < 8 && Math.abs(m.y - y) < 8) {
      m.remaining = Math.max(m.remaining, lead);
      m.lead = Math.max(m.lead, lead);
      return;
    }
  }
  list.push({ x, y, remaining: lead, lead });
}

export function tickTelegraphs(list: WaveTelegraphMarker[], dt: number): void {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].remaining -= dt;
    if (list[i].remaining <= 0) list.splice(i, 1);
  }
}

export function setWaveBanner(
  banner: WaveBannerState | null,
  text: string,
  duration = 1.4,
  sub?: string
): WaveBannerState {
  return { text, remaining: duration, sub };
}

export function tickBanner(banner: WaveBannerState | null, dt: number): WaveBannerState | null {
  if (!banner) return null;
  banner.remaining -= dt;
  return banner.remaining <= 0 ? null : banner;
}
