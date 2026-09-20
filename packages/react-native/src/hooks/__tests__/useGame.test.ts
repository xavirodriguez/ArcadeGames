import { Platform } from "react-native";
import { BaseGame, WebAudioPlayer, IAudioPlayer, NullAudioPlayer } from "@tiny-aster/core";
import { ExpoAudioPlayer } from "../../audio/ExpoAudioPlayer";

class TestGame extends BaseGame<Record<string, unknown>, Record<string, unknown>, any, any, any> {
  public passedAudio: IAudioPlayer;
  constructor(config: any) {
    super(config);
    this.passedAudio = config.audio;
  }
  public update(_dt: number): void {}
  public getGameState(): Record<string, unknown> { return {}; }
  public isGameOver(): boolean { return false; }
}

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn().mockReturnValue({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
    volume: 1.0,
  }),
}));

describe("useGame audio player selection", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.clearAllMocks();
  });

  function getAudioForPlatform(customAudio?: IAudioPlayer): IAudioPlayer {
    if (customAudio) return customAudio;
    return (Platform.OS as string) === "web" ? new WebAudioPlayer() : new ExpoAudioPlayer();
  }

  test("selects WebAudioPlayer when Platform.OS is web", () => {
    Platform.OS = "web";
    const audio = getAudioForPlatform();
    const game = new TestGame({ audio });

    expect(game.passedAudio).toBeInstanceOf(WebAudioPlayer);
  });

  test("selects ExpoAudioPlayer when Platform.OS is ios or android", () => {
    Platform.OS = "ios";
    const audio = getAudioForPlatform();
    const game = new TestGame({ audio });

    expect(game.passedAudio).toBeInstanceOf(ExpoAudioPlayer);
  });

  test("allows consumer to override default audio player", () => {
    Platform.OS = "ios";
    const customAudio = new NullAudioPlayer();
    const audio = getAudioForPlatform(customAudio);
    const game = new TestGame({ audio });

    expect(game.passedAudio).toBe(customAudio);
  });
});
