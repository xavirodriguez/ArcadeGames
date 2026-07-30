declare const __DEV__: boolean;

const isDev = typeof (globalThis as any).__DEV__ !== "undefined"
  ? (globalThis as any).__DEV__
  : (process.env.NODE_ENV !== "production");

/**
 * Platform-agnostic core logging utility.
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
  debug: (namespace: string, ...args: unknown[]) => {
    if (isDev) console.log(`[${namespace}]`, ...args);
  }
};
