import { hashSoA, SoAWorldSnapshot } from "@tiny-aster/core";
import { VerticalShmupGame } from "../VerticalShmupGame";
import { ShmupWaveAnnouncementSystem } from "../systems/ShmupWaveAnnouncementSystem";
import {
  createWaveAnnouncement,
  resolveWaveAnnouncementAlpha,
  WAVE_ANNOUNCEMENT_RESOURCE,
  type ShmupWaveAnnouncement
} from "../presentation/ShmupWaveAnnouncement";

function announcementOf(game: VerticalShmupGame): ShmupWaveAnnouncement | undefined {
  return game.world.getResource<ShmupWaveAnnouncement>(WAVE_ANNOUNCEMENT_RESOURCE);
}

describe("Wave announcement helpers (T6)", () => {
  it("creates a full-duration banner", () => {
    expect(createWaveAnnouncement(5, 2)).toEqual({ wave: 5, remaining: 2, duration: 2 });
    expect(createWaveAnnouncement(0, 0)).toEqual({ wave: 1, remaining: 2, duration: 2 });
  });

  it("fades out monotonically near expiry", () => {
    const banner = createWaveAnnouncement(5, 2);
    const full = resolveWaveAnnouncementAlpha(banner);
    const fading = resolveWaveAnnouncementAlpha({ ...banner, remaining: 0.4 });
    const expired = resolveWaveAnnouncementAlpha({ ...banner, remaining: 0 });
    expect(full).toBe(1);
    expect(fading).toBeCloseTo(0.5, 12);
    expect(expired).toBe(0);
  });
});

describe("Wave announcement system (T6)", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) game.destroy();
  });

  async function createGame(): Promise<VerticalShmupGame> {
    const game = new VerticalShmupGame({ headless: true, manualLoop: true });
    games.push(game);
    await game.init();
    game.update(0);
    return game;
  }

  function announce(game: VerticalShmupGame, wave: number): void {
    game.world.getEventBus()?.emitDeferred("shmup:wave_complete", { wave });
    game.world.getEventBus()?.flushDeferred();
  }

  it("appears with the announced wave number", async () => {
    const game = await createGame();
    const system = new ShmupWaveAnnouncementSystem();
    system.update(game.world, 0);
    announce(game, 5);

    expect(announcementOf(game)).toEqual({ wave: 5, remaining: 2, duration: 2 });
    expect(system.runsWhileFrozen).toBe(true);
  });

  it("does not repeat the same wave and switches to the next one", async () => {
    const game = await createGame();
    const system = new ShmupWaveAnnouncementSystem();
    system.update(game.world, 0);
    announce(game, 5);
    system.update(game.world, 2);
    expect(announcementOf(game)?.remaining).toBe(0);

    announce(game, 5);
    expect(announcementOf(game)?.remaining).toBe(0);
    expect(announcementOf(game)?.wave).toBe(5);

    announce(game, 6);
    expect(announcementOf(game)).toEqual({ wave: 6, remaining: 2, duration: 2 });
  });

  it("expires by decrementing remaining with deltaTime", async () => {
    const game = await createGame();
    const system = new ShmupWaveAnnouncementSystem();
    system.update(game.world, 0);
    announce(game, 7);
    for (let step = 0; step < 8; step += 1) system.update(game.world, 0.25);

    expect(announcementOf(game)?.remaining).toBe(0);
    expect(announcementOf(game)?.wave).toBe(7);
  });

  it("ignores events during rollback resimulation", async () => {
    const game = await createGame();
    const system = new ShmupWaveAnnouncementSystem();
    system.update(game.world, 0);
    game.world.isReSimulating = true;
    announce(game, 5);
    expect(announcementOf(game)).toBeUndefined();

    game.world.isReSimulating = false;
    announce(game, 5);
    expect(announcementOf(game)?.wave).toBe(5);
  });

  it("does not change gameplay state", async () => {
    const game = await createGame();
    const system = new ShmupWaveAnnouncementSystem();
    system.update(game.world, 0);
    const before = hashSoA(game.world.snapshot() as SoAWorldSnapshot);

    announce(game, 5);
    system.update(game.world, 1 / 60);
    system.update(game.world, 2);

    expect(hashSoA(game.world.snapshot() as SoAWorldSnapshot)).toBe(before);
  });

  it("keeps the banner out of snapshot resources", async () => {
    const game = await createGame();
    new ShmupWaveAnnouncementSystem().update(game.world, 0);
    announce(game, 5);
    const snapshot = game.world.snapshot() as SoAWorldSnapshot;
    expect(snapshot.snapshotResourceKeys ?? []).not.toContain(WAVE_ANNOUNCEMENT_RESOURCE);
  });
});
