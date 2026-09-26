import { NativeAssetProvider } from "../NativeAssetProvider";
import { resolveNativeAudioSource, NATIVE_AUDIO_MAP, SHARED_AUDIO_MANIFEST_NATIVE } from "../nativeAudioManifest";

describe("NativeAssetProvider & nativeAudioManifest", () => {
  let provider: NativeAssetProvider;

  beforeEach(() => {
    provider = new NativeAssetProvider();
  });

  test("resolveNativeAudioSource returns number directly if passed a module ID number", () => {
    expect(resolveNativeAudioSource(123)).toBe(123);
  });

  test("resolveNativeAudioSource resolves known sound IDs and web paths from NATIVE_AUDIO_MAP", () => {
    const resolvedShoot = resolveNativeAudioSource("shoot");
    expect(resolvedShoot).toBe(NATIVE_AUDIO_MAP["shoot"]);

    const resolvedPath = resolveNativeAudioSource("/assets/audio/combat/shoot.wav");
    expect(resolvedPath).toBe(NATIVE_AUDIO_MAP["/assets/audio/combat/shoot.wav"]);
  });

  test("resolveNativeAudioSource handles http / https / file URIs", () => {
    expect(resolveNativeAudioSource("https://example.com/audio.mp3")).toEqual({
      uri: "https://example.com/audio.mp3"
    });
    expect(resolveNativeAudioSource("file:///local/audio.wav")).toEqual({
      uri: "file:///local/audio.wav"
    });
  });

  test("resolveNativeAudioSource handles object input with path/uri", () => {
    expect(resolveNativeAudioSource({ path: "shoot" })).toBe(NATIVE_AUDIO_MAP["shoot"]);
    expect(resolveNativeAudioSource({ uri: 456 })).toBe(456);
  });

  test("NativeAssetProvider loads audio and image through native resolver", async () => {
    const audioAsset = await provider.loadAudio("shoot");
    expect(audioAsset).toBe(NATIVE_AUDIO_MAP["shoot"]);

    const fontResult = await provider.loadFont("Arcade");
    expect(fontResult).toBe(true);

    const genericResult = await provider.load("config.json");
    expect(genericResult).toEqual({ path: "config.json" });
  });

  test("SHARED_AUDIO_MANIFEST_NATIVE exports mapped definitions", () => {
    expect(SHARED_AUDIO_MANIFEST_NATIVE.length).toBeGreaterThan(0);
    const shootAsset = SHARED_AUDIO_MANIFEST_NATIVE.find((a) => a.id === "shoot");
    expect(shootAsset).toBeDefined();
  });
});
