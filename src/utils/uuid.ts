/**
 * Cross-platform, cryptographically secure UUID generation.
 *
 * @remarks
 * React Native's Hermes runtime does not expose a global `crypto` object, so
 * calling `crypto.randomUUID()` directly throws `ReferenceError: Property
 * 'crypto' doesn't exist`. This helper uses the Web Crypto API when it is
 * available (web browsers and Node) and otherwise delegates to `expo-crypto`,
 * which provides a native CSPRNG on iOS and Android. Both branches produce an
 * RFC 4122 version 4 UUID, so the generated identifiers remain valid for
 * `z.string().uuid()` validation and stable across sessions once persisted.
 */

interface WebCryptoLike {
  randomUUID?: () => string;
}

/**
 * Generates an RFC 4122 version 4 UUID using a cryptographically secure source
 * on both web and native runtimes.
 *
 * @returns A promise resolving to a random UUID v4 string.
 */
export async function generateUuid(): Promise<string> {
  const globalCrypto = (globalThis as { crypto?: WebCryptoLike }).crypto;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }

  // Native runtime (Hermes): `globalThis.crypto` is unavailable, so rely on
  // expo-crypto's platform-backed random source. Imported lazily so bundling
  // the web/Node path never touches the native module.
  const { randomUUID } = await import("expo-crypto");
  return randomUUID();
}
