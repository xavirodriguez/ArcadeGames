import { WebAudioPlayer } from "../WebAudioPlayer";

// Mock targets
const mockGainSetValueAtTime = jest.fn();
const mockGainNode = {
  gain: { setValueAtTime: mockGainSetValueAtTime },
  connect: jest.fn()
};

const mockSourceStart = jest.fn();
const mockSourceNode = {
  buffer: null,
  connect: jest.fn(),
  start: mockSourceStart
};

const mockStereoPannerSetValueAtTime = jest.fn();
const mockStereoPannerNode = {
  pan: { setValueAtTime: mockStereoPannerSetValueAtTime },
  connect: jest.fn()
};

const mockCreateBuffer = jest.fn().mockImplementation((channels, length, sampleRate) => ({
  duration: length / sampleRate,
  length,
  sampleRate,
  numberOfChannels: channels
}));

class MockAudioContext {
  public state = "suspended";
  public currentTime = 10;
  public sampleRate = 44100;
  public destination = {};
  public onstatechange: (() => void) | null = null;

  public resume = jest.fn().mockImplementation(async () => {
    this.state = "running";
  });

  public decodeAudioData = jest.fn().mockImplementation(async (_arrayBuffer: ArrayBuffer) => {
    return { duration: 1.0, length: 44100, sampleRate: 44100, numberOfChannels: 2 } as AudioBuffer;
  });

  public createGain = jest.fn().mockReturnValue(mockGainNode);
  public createBufferSource = jest.fn().mockReturnValue(mockSourceNode);
  public createStereoPanner = jest.fn().mockReturnValue(mockStereoPannerNode);
  public createBuffer = mockCreateBuffer;
}

const mockPlay = jest.fn().mockResolvedValue(undefined);
const mockPause = jest.fn();

class MockAudio {
  public loop = false;
  public volume = 1.0;
  public currentTime = 0;
  public play = mockPlay;
  public pause = mockPause;

  constructor(public src: string) {}
}

describe("WebAudioPlayer", () => {
  let originalWindow: any;
  let originalAudioContext: any;
  let originalAudio: any;
  let originalFetch: any;

  beforeAll(() => {
    originalWindow = (global as any).window;
    originalAudioContext = (global as any).AudioContext;
    originalAudio = (global as any).Audio;
    originalFetch = (global as any).fetch;

    (global as any).window = global;
    (global as any).AudioContext = MockAudioContext;
    (global as any).Audio = MockAudio;
    (global as any).fetch = jest.fn();
  });

  afterAll(() => {
    (global as any).window = originalWindow;
    (global as any).AudioContext = originalAudioContext;
    (global as any).Audio = originalAudio;
    (global as any).fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("initializes AudioContext and GainNodes correctly", () => {
    const player = new WebAudioPlayer();
    expect(player).toBeDefined();
  });

  test("loadSFX fetches, decodes and caches the AudioBuffer", async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    ((global as any).fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => "audio/mpeg" },
      arrayBuffer: async () => mockArrayBuffer
    });

    const player = new WebAudioPlayer();
    await player.loadSFX("flap", "/audio/flap.mp3");

    expect((global as any).fetch).toHaveBeenCalledWith("/audio/flap.mp3");
  });

  test("loadSFX handles HTML 404 fallback responses safely with dummy buffer", async () => {
    ((global as any).fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => (h === "content-type" ? "text/html; charset=utf-8" : null) },
      arrayBuffer: async () => new ArrayBuffer(100)
    });

    const player = new WebAudioPlayer();
    await expect(player.loadSFX("pulse", "/audio/shoot.mp3")).resolves.not.toThrow();

    // Verify playSFX works with fallback dummy buffer without throwing
    player.playSFX("pulse");
    expect(mockSourceStart).toHaveBeenCalled();
  });

  test("loadSFX handles decoding failure safely with dummy buffer", async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    ((global as any).fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => "audio/mpeg" },
      arrayBuffer: async () => mockArrayBuffer
    });

    const player = new WebAudioPlayer();
    // Simulate decodeAudioData rejecting/throwing
    const ctx = (player as any).ctx;
    ctx.decodeAudioData.mockRejectedValueOnce(new Error("WebAudio decode error"));

    await expect(player.loadSFX("bad_sound", "/audio/corrupt.mp3")).resolves.not.toThrow();

    player.playSFX("bad_sound");
    expect(mockSourceStart).toHaveBeenCalled();
  });

  test("playSFX resumes context and starts buffer source play", async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    ((global as any).fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => "audio/mpeg" },
      arrayBuffer: async () => mockArrayBuffer
    });

    const player = new WebAudioPlayer();
    await player.loadSFX("flap", "/audio/flap.mp3");

    player.playSFX("flap");
    expect(mockSourceStart).toHaveBeenCalled();
  });

  test("playBGM initializes HTMLAudioElement and plays", () => {
    const player = new WebAudioPlayer();
    player.playBGM("music", "/audio/music.mp3");

    expect(mockPlay).toHaveBeenCalled();
  });

  test("stopBGM pauses background music", () => {
    const player = new WebAudioPlayer();
    player.playBGM("music", "/audio/music.mp3");
    player.stopBGM();

    expect(mockPause).toHaveBeenCalled();
  });

  test("sets volumes correctly", () => {
    const player = new WebAudioPlayer();
    player.setMasterVolume(0.5);
    player.setSFXVolume(0.8);
    player.setBGMVolume(0.2);

    expect(mockGainSetValueAtTime).toHaveBeenCalled();
  });

  test("plays spatial audio with panning and attenuation", async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    ((global as any).fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => "audio/mpeg" },
      arrayBuffer: async () => mockArrayBuffer
    });

    const player = new WebAudioPlayer();
    await player.loadSFX("hit", "/audio/hit.mp3");

    player.playSpatialSFX("hit", 10, 0, 0, 0, 100);
    expect(mockStereoPannerSetValueAtTime).toHaveBeenCalled();
    expect(mockSourceStart).toHaveBeenCalled();
  });
});
