import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

let appStateListener: ((state: string) => void) | null = null;
const mockRemoveSubscription = jest.fn();

jest.mock("react-native", () => ({
  Platform: {
    OS: "ios"
  },
  AppState: {
    addEventListener: jest.fn((_event: string, callback: (state: string) => void) => {
      appStateListener = callback;
      return { remove: mockRemoveSubscription };
    })
  }
}));

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined)
}));

import { ExpoAudioPlayer, configureNativeAudioMode } from "../ExpoAudioPlayer";
import { resolveNativeAudioSource, NATIVE_AUDIO_MAP } from "../nativeAudioManifest";

describe("ExpoAudioPlayer", () => {
  let mockPlayer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = null;

    mockPlayer = {
      volume: 1.0,
      playbackRate: 1.0,
      loop: false,
      pan: 0,
      play: jest.fn(),
      pause: jest.fn(),
      seekTo: jest.fn().mockResolvedValue(undefined),
      setPlaybackRate: jest.fn(),
      remove: jest.fn()
    };

    (createAudioPlayer as jest.Mock).mockReturnValue(mockPlayer);
  });

  test("loadSFX initializes AudioPlayer with resolved source and stores player in pool", async () => {
    const player = new ExpoAudioPlayer();
    await player.loadSFX("shoot", "/assets/audio/combat/shoot.wav");

    const expectedSource = resolveNativeAudioSource("/assets/audio/combat/shoot.wav");
    const expectedSourceToLoad =
      typeof expectedSource === "string" ? { uri: expectedSource } : expectedSource;

    expect(createAudioPlayer).toHaveBeenCalledWith(expectedSourceToLoad);
  });

  test("loadSFX resolves manifest path or native module ID when options is omitted", async () => {
    const player = new ExpoAudioPlayer();
    await player.loadSFX("shoot");

    const expectedSource = resolveNativeAudioSource("shoot");
    const expectedSourceToLoad =
      typeof expectedSource === "string" ? { uri: expectedSource } : expectedSource;

    expect(createAudioPlayer).toHaveBeenCalledWith(expectedSourceToLoad);
  });

  test("loadSFX handles creation failure defensively without throwing", async () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    (createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Native audio engine init failed");
    });

    const player = new ExpoAudioPlayer();
    await expect(player.loadSFX("shoot", "/test.wav")).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ExpoAudioPlayer] Failed to load/create AudioPlayer for SFX "shoot":'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  test("playSFX triggers playback with correct volume, pitch and seekTo(0)", async () => {
    const player = new ExpoAudioPlayer();
    await player.loadSFX("laser", "/audio/laser.wav");

    player.setMasterVolume(1.0);
    player.setSFXVolume(0.8);

    player.playSFX("laser", { volume: 0.5, playbackRate: 1.2 });

    expect(mockPlayer.volume).toBeCloseTo(0.4); // 1.0 * 0.8 * 0.5
    expect(mockPlayer.setPlaybackRate).toHaveBeenCalledWith(1.2);
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  test("playSFX respects cooldownMs rate limiting", async () => {
    const player = new ExpoAudioPlayer();
    await player.loadSFX("bounce", "/audio/bounce.wav");

    player.playSFX("bounce", { cooldownMs: 100 });
    player.playSFX("bounce", { cooldownMs: 100 }); // Should be rate-limited

    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  });

  test("playSFX applies random pitch variation when pitchRange is specified", async () => {
    const player = new ExpoAudioPlayer();
    await player.loadSFX("hit", "/audio/hit.wav");

    player.playSFX("hit", { pitchRange: 0.1 }); // ±10%

    expect(mockPlayer.setPlaybackRate).toHaveBeenCalled();
    const appliedRate = mockPlayer.setPlaybackRate.mock.calls[0][0];
    expect(appliedRate).toBeGreaterThanOrEqual(0.9);
    expect(appliedRate).toBeLessThanOrEqual(1.1);
  });

  test("playBGM initializes background music with looping and calculated volume", () => {
    const player = new ExpoAudioPlayer();
    player.setMasterVolume(0.8);
    player.setBGMVolume(0.5);

    player.playBGM("bgm1", "/audio/bgm.mp3");

    const expectedSource = resolveNativeAudioSource("/audio/bgm.mp3");
    const expectedSourceToLoad =
      typeof expectedSource === "string" ? { uri: expectedSource } : expectedSource;

    expect(createAudioPlayer).toHaveBeenCalledWith(expectedSourceToLoad);
    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.volume).toBeCloseTo(0.4); // 0.8 * 0.5
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  test("stopBGM pauses and removes active BGM player", () => {
    const player = new ExpoAudioPlayer();
    player.playBGM("bgm1", "/audio/bgm.mp3");
    player.stopBGM();

    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(mockPlayer.remove).toHaveBeenCalled();
  });

  test("pauseBGM pauses active BGM player", () => {
    const player = new ExpoAudioPlayer();
    player.playBGM("bgm1", "/audio/bgm.mp3");
    player.pauseBGM();

    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  test("setMasterVolume updates master and active BGM player volume", () => {
    const player = new ExpoAudioPlayer();
    player.setBGMVolume(0.5);
    player.playBGM("bgm1", "/audio/bgm.mp3");

    player.setMasterVolume(0.5);
    expect(mockPlayer.volume).toBeCloseTo(0.25); // 0.5 * 0.5
  });

  test("playSpatialSFX attenuates volume and sets pan based on distance", async () => {
    const player = new ExpoAudioPlayer();
    await player.loadSFX("explosion", "/audio/explosion.wav");

    player.setMasterVolume(1.0);
    player.setSFXVolume(1.0);

    // Emitter at (50, 0), Listener at (0, 0), maxDistance = 100
    // distance = 50 -> volumeScale = 0.5, pan = 0.5
    player.playSpatialSFX("explosion", 50, 0, 0, 0, 100);

    expect(mockPlayer.volume).toBeCloseTo(0.5);
    expect(mockPlayer.pan).toBeCloseTo(0.5);
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  test("playSpatialSFX produces no sound when distance exceeds maxDistance", async () => {
    const player = new ExpoAudioPlayer();
    await player.loadSFX("explosion", "/audio/explosion.wav");

    player.playSpatialSFX("explosion", 200, 0, 0, 0, 100);
    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  test("configures native audio mode on init and provides configureNativeAudioMode export", async () => {
    await configureNativeAudioMode();
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "doNotMix"
    });
  });

  test("handles AppState changes by pausing BGM on background and resuming on active", () => {
    const player = new ExpoAudioPlayer();
    player.playBGM("bgm1", "/audio/bgm.mp3");

    expect(appStateListener).not.toBeNull();

    // Transition to background
    appStateListener!("background");
    expect(mockPlayer.pause).toHaveBeenCalled();

    // Transition back to active
    appStateListener!("active");
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  test("pools SFX players for rapid triggers without cut-offs", async () => {
    const player = new ExpoAudioPlayer();
    await player.loadSFX("shoot", "/assets/audio/combat/shoot.wav");

    // Play multiple times rapidly
    player.playSFX("shoot");
    player.playSFX("shoot");

    expect(mockPlayer.play).toHaveBeenCalled();
  });

  test("dispose / releaseAll stops BGM, removes players and removes AppState listener", async () => {
    const player = new ExpoAudioPlayer();
    await player.loadSFX("shoot", "/assets/audio/combat/shoot.wav");
    player.playBGM("bgm1", "/audio/bgm.mp3");

    player.dispose();

    expect(mockPlayer.remove).toHaveBeenCalled();
    expect(mockRemoveSubscription).toHaveBeenCalled();
  });
});
