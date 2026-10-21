import { SoundBank } from "../SoundBank";
import { NullAudioPlayer } from "../IAudioPlayer";

describe("SoundBank", () => {
  it("registers cue bank data and plays cues with NullAudioPlayer", () => {
    const bank = new SoundBank({ maxCueVoices: 2, maxGlobalVoices: 4 });
    const player = new NullAudioPlayer();
    const playSpy = jest.spyOn(player, "playSFX");

    bank.registerCueBank({
      version: "1.0.0",
      cues: {
        laser: {
          id: "laser",
          category: "combat",
          files: ["combat/laser_1.wav", "combat/laser_2.wav"],
          variants: 2,
          cooldownMs: 0,
          priority: "high",
        },
      },
    });

    bank.playCue("laser", player);
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(bank.getActiveVoiceCount()).toBe(1);
  });

  it("prevents consecutive variant repetition when variants > 1", () => {
    const bank = new SoundBank();
    const player = new NullAudioPlayer();
    const playedFiles: string[] = [];

    jest.spyOn(player, "playSFX").mockImplementation((id: string) => {
      playedFiles.push(id);
    });

    bank.registerCueBank({
      version: "1.0.0",
      cues: {
        shoot: {
          id: "shoot",
          category: "combat",
          files: ["combat/shoot_1.wav", "combat/shoot_2.wav"],
          variants: 2,
          cooldownMs: 0,
        },
      },
    });

    for (let i = 0; i < 10; i++) {
      bank.playCue("shoot", player);
    }

    expect(playedFiles.length).toBe(10);
    for (let i = 1; i < playedFiles.length; i++) {
      expect(playedFiles[i]).not.toBe(playedFiles[i - 1]);
    }
  });

  it("enforces cue voice limits and steals oldest voice of same cue", () => {
    const bank = new SoundBank({ maxCueVoices: 2 });
    const player = new NullAudioPlayer();

    bank.registerCueBank({
      version: "1.0.0",
      cues: {
        explosion: {
          id: "explosion",
          category: "combat",
          files: ["combat/explosion.wav"],
          variants: 1,
          cooldownMs: 0,
        },
      },
    });

    bank.playCue("explosion", player);
    bank.playCue("explosion", player);
    expect(bank.getActiveVoiceCount()).toBe(2);

    bank.playCue("explosion", player);
    expect(bank.getActiveVoiceCount()).toBe(2);
  });
});
