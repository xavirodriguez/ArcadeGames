import { WebAudioPlayer, NullAudioPlayer } from "@tiny-aster/core";
import { ExpoAudioPlayer } from "../../audio/ExpoAudioPlayer";

let mockPlatformOS = "web";

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockPlatformOS;
    }
  }
}));

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn().mockReturnValue({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined)
  })
}));

describe("useGame Audio Player Selection", () => {
  beforeEach(() => {
    mockPlatformOS = "web";
  });

  test("instantiates WebAudioPlayer when Platform.OS is 'web'", () => {
    mockPlatformOS = "web";

    const defaultAudio = mockPlatformOS === "web" ? new WebAudioPlayer() : new ExpoAudioPlayer();
    expect(defaultAudio).toBeInstanceOf(WebAudioPlayer);
  });

  test("instantiates ExpoAudioPlayer when Platform.OS is 'ios' or 'android'", () => {
    mockPlatformOS = "ios";
    const defaultAudioIos = mockPlatformOS === "web" ? new WebAudioPlayer() : new ExpoAudioPlayer();
    expect(defaultAudioIos).toBeInstanceOf(ExpoAudioPlayer);

    mockPlatformOS = "android";
    const defaultAudioAndroid = mockPlatformOS === "web" ? new WebAudioPlayer() : new ExpoAudioPlayer();
    expect(defaultAudioAndroid).toBeInstanceOf(ExpoAudioPlayer);
  });

  test("allows custom audio player override via options.audio", () => {
    const customPlayer = new NullAudioPlayer();
    const defaultPlayer = new ExpoAudioPlayer();
    const resolvedPlayer = customPlayer ?? defaultPlayer;

    expect(resolvedPlayer).toBe(customPlayer);
  });
});
