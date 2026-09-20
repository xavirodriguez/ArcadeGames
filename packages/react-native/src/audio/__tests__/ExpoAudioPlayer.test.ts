import { createAudioPlayer } from "expo-audio";
import { ExpoAudioPlayer } from "../ExpoAudioPlayer";
import { SHARED_AUDIO_MANIFEST } from "@tiny-aster/core";

const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockSeekTo = jest.fn().mockResolvedValue(undefined);
const mockRemove = jest.fn();
const mockSetPlaybackRate = jest.fn();

const createMockAudioPlayer = () => ({
  play: mockPlay,
  pause: mockPause,
  seekTo: mockSeekTo,
  remove: mockRemove,
  setPlaybackRate: mockSetPlaybackRate,
  volume: 1.0,
  playbackRate: 1.0,
  loop: false,
});

let mockCreatedPlayers: ReturnType<typeof createMockAudioPlayer>[] = [];

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn().mockImplementation(() => {
    const player = createMockAudioPlayer();
    mockCreatedPlayers.push(player);
    return player;
  }),
}));

describe("ExpoAudioPlayer", () => {
  let player: ExpoAudioPlayer;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatedPlayers = [];
    player = new ExpoAudioPlayer();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test("loadSFX resolves source from manifest and creates player", async () => {
    const shootAsset = SHARED_AUDIO_MANIFEST.find((a) => a.id === "shoot");
    await player.loadSFX("shoot");

    expect(createAudioPlayer).toHaveBeenCalledWith({ uri: shootAsset?.path });
    expect(mockCreatedPlayers.length).toBe(1);
  });

  test("loadSFX respects custom URI options", async () => {
    await player.loadSFX("custom", "https://example.com/sound.mp3");

    expect(createAudioPlayer).toHaveBeenCalledWith({ uri: "https://example.com/sound.mp3" });
  });

  test("playSFX triggers play on loaded player and applies volume", async () => {
    await player.loadSFX("shoot");
    player.playSFX("shoot", { volume: 0.5 });

    const createdPlayer = mockCreatedPlayers[0];
    expect(mockSeekTo).toHaveBeenCalledWith(0);
    expect(mockPlay).toHaveBeenCalled();
    // Default master (1.0) * sfx (0.85) * volume (0.5) = 0.425
    expect(createdPlayer.volume).toBeCloseTo(0.425, 3);
  });

  test("playSFX lazily creates player if not preloaded", () => {
    player.playSFX("shoot");

    expect(createAudioPlayer).toHaveBeenCalled();
    expect(mockPlay).toHaveBeenCalled();
  });

  test("playSFX respects cooldownMs rate-limiting", () => {
    player.playSFX("shoot", { cooldownMs: 100 });
    expect(mockPlay).toHaveBeenCalledTimes(1);

    // Call immediately again - should be rate-limited
    player.playSFX("shoot", { cooldownMs: 100 });
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  test("playSFX applies pitch variation when pitchRange is provided", () => {
    player.playSFX("shoot", { pitchRange: 0.1 });

    expect(mockSetPlaybackRate).toHaveBeenCalled();
    const appliedRate = mockSetPlaybackRate.mock.calls[0][0];
    expect(appliedRate).toBeGreaterThanOrEqual(0.9);
    expect(appliedRate).toBeLessThanOrEqual(1.1);
  });

  test("playBGM sets loop, volume, and starts playback", () => {
    player.playBGM("dark_atmosphere");

    expect(createAudioPlayer).toHaveBeenCalled();
    const bgmPlayer = mockCreatedPlayers[0];
    expect(bgmPlayer.loop).toBe(true);
    // master (1.0) * bgm (0.35) = 0.35
    expect(bgmPlayer.volume).toBeCloseTo(0.35, 2);
    expect(mockPlay).toHaveBeenCalled();
  });

  test("pauseBGM and stopBGM control BGM playback correctly", () => {
    player.playBGM("dark_atmosphere");
    expect(mockPlay).toHaveBeenCalledTimes(1);

    player.pauseBGM();
    expect(mockPause).toHaveBeenCalledTimes(1);

    player.stopBGM();
    expect(mockPause).toHaveBeenCalledTimes(2);
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  test("playSpatialSFX attenuates volume based on listener distance", () => {
    // Distance = 50, maxDistance = 100 -> spatial factor = 0.5
    player.playSpatialSFX("shoot", 50, 0, 0, 0, 100);

    expect(mockPlay).toHaveBeenCalled();
    const createdPlayer = mockCreatedPlayers[0];
    // master (1.0) * sfx (0.85) * spatialFactor (0.5) = 0.425
    expect(createdPlayer.volume).toBeCloseTo(0.425, 3);
  });

  test("playSpatialSFX drops sound if distance exceeds maxDistance", () => {
    player.playSpatialSFX("shoot", 150, 0, 0, 0, 100);

    expect(mockPlay).not.toHaveBeenCalled();
  });

  test("volume setters update global volumes and sync active BGM player", () => {
    player.playBGM("dark_atmosphere");
    const bgmPlayer = mockCreatedPlayers[0];

    player.setMasterVolume(0.5);
    player.setBGMVolume(0.5);

    // master (0.5) * bgm (0.5) = 0.25
    expect(bgmPlayer.volume).toBeCloseTo(0.25, 2);
  });

  test("logs console.warn defensively if audio creation fails", () => {
    (createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Native audio engine error");
    });

    expect(() => player.playSFX("failing_sound")).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ExpoAudioPlayer]'),
      expect.any(Error)
    );
  });
});
