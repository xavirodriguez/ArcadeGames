import { CompactInputFrame } from "../input/InputFrame";

/**
 * Server-side security and sanitization layer for client-submitted simulation inputs.
 *
 * @remarks
 * Restricts client input rates, ensures sequential tick progression, and filters out
 * malformed or unsafe analog axis coordinates to prevent exploits or numerical divergence.
 * @public
 */
export class InputValidator {
  /**
   * Validates a client input frame against the server's history.
   *
   * @param clientFrame - The CompactInputFrame received from the client.
   * @param lastProcessedTick - The tick index of the last processed frame from this client.
   * @param maxTickDelta - The maximum allowed distance between ticks to prevent skipping. Defaults to 10.
   * @returns true if the frame is completely valid and secure, false if it should be rejected.
   */
  public static validateFrame(
    clientFrame: CompactInputFrame,
    lastProcessedTick: number,
    maxTickDelta = 10
  ): boolean {
    // 1. Tick must be strictly progressive
    if (clientFrame.t <= lastProcessedTick) {
      return false; // Out-of-order or duplicate tick
    }

    // 2. Prevent extreme tick skipping (rate limit check)
    if (clientFrame.t - lastProcessedTick > maxTickDelta) {
      return false; // Extreme leap detected (potential speed hack or connection lag-out)
    }

    // 3. Validate analog axes bounds (ensure no overflow or NaN values are injected)
    if (clientFrame.a) {
      const [x, y] = clientFrame.a;
      if (isNaN(x) || isNaN(y)) {
        return false; // Injection of NaN
      }
      if (!isFinite(x) || !isFinite(y)) {
        return false; // Injection of Infinity
      }
      if (Math.abs(x) > 1.1 || Math.abs(y) > 1.1) {
        return false; // Overflow of analog stick values (standard stick value is between -1.0 and 1.0)
      }
    }

    return true;
  }

  /**
   * Sanitizes axis coordinates in place to be strictly clamped within standard limits [-1.0, 1.0].
   */
  public static sanitizeFrame(clientFrame: CompactInputFrame): CompactInputFrame {
    if (clientFrame.a) {
      const x = Math.max(-1.0, Math.min(1.0, clientFrame.a[0]));
      const y = Math.max(-1.0, Math.min(1.0, clientFrame.a[1]));
      return {
        ...clientFrame,
        a: [x, y]
      };
    }
    return clientFrame;
  }
}
