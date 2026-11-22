import { test, expect } from "@playwright/test";

interface HitRunE2EDebug {
  getPlayerX: () => number | null;
  getPlayerHealth: () => number | null;
  getAliveEnemyCount: () => number;
  getCombatableEnemyCount: () => number;
  getWaveOwnedEnemyCount: () => number;
  getWaveCombatableEnemyCount: () => number;
  getWaveState: () => {
    hasDirector: boolean;
    hasScript: boolean;
    scriptMatches: boolean;
    hasEnemyPool: boolean;
    sectionIndex: number | null;
    simulationFrozen: boolean;
    paused: boolean;
    timeScale: number | null;
    activeGroups: readonly string[] | null;
    scriptId: string | null;
    active: boolean;
    elapsed: number;
    nextEventIndex: number;
    eventCount: number;
    pendingSpawnCount: number;
    expectedSpawnCount: number;
    totalSpawned: number;
    failedSpawnCount: number;
    spawnComplete: boolean;
    loop: boolean;
  };
  getDeathFlowState: () => {
    active: boolean;
    remaining: number;
    requestRestart: boolean;
  };
  getTimeScale: () => number;
  getRunDeaths: () => number;
  getCombatInput: () => { attackHeld: boolean; fireHeld: boolean };
  getComboStep: () => string | null;
  getMeleePhase: () => string | null;
  getActiveProjectileCount: () => number;
  getWeaponCooldown: () => number;
  getWeaponId: () => string | null;
}

declare global {
  interface Window {
    __hitAndRunDebug?: HitRunE2EDebug;
  }
}

async function waitForHitRunDebug(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => typeof window.__hitAndRunDebug?.getPlayerX === "function" &&
      typeof window.__hitAndRunDebug?.getWaveState === "function",
    undefined,
    { timeout: 20000 }
  );
}

const readPlayerX = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getPlayerX() ?? null);
const readPlayerHealth = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getPlayerHealth() ?? null);
const readAliveEnemies = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getAliveEnemyCount() ?? 0);
const readCombatableEnemies = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getCombatableEnemyCount() ?? 0);
const readWaveOwnedEnemies = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getWaveOwnedEnemyCount() ?? 0);
const readWaveCombatableEnemies = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getWaveCombatableEnemyCount() ?? 0);
const readWaveState = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getWaveState() ?? null);
const readTimeScale = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getTimeScale() ?? 1);
/** Reads the death flow, the death counter and the time scale in one round trip. */
const readDeathObservation = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const debug = window.__hitAndRunDebug;
    return {
      active: debug?.getDeathFlowState().active ?? false,
      deaths: debug?.getRunDeaths() ?? 0,
      timeScale: debug?.getTimeScale() ?? 1
    };
  });
const readCombatInput = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getCombatInput() ?? null);
const readComboStep = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getComboStep() ?? null);
const readMeleePhase = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getMeleePhase() ?? null);
const readActiveProjectiles = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getActiveProjectileCount() ?? 0);
const readWeaponCooldown = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getWeaponCooldown() ?? 0);

test.describe("Hit & Run gameplay lifecycle E2E", () => {
  test("loads the route and moves the player through the real browser input bridge", async ({ page }) => {
    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("CONSOLE_" + m.type() + ">>>" + m.text().slice(0, 400) + "<<<"); });
    page.on("pageerror", (error) => pageErrors.push(error));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    page.on("pageerror", (e) => console.log("PAGEERROR_STACK>>>" + e.stack + "<<<"));
    await page.goto("/hitandrun");
    await waitForHitRunDebug(page);
    await expect(page.locator("canvas").first()).toBeVisible();

    const initialX = await readPlayerX(page);
    expect(initialX).not.toBeNull();

    await page.keyboard.down("ArrowRight");
    try {
      await expect.poll(() => readPlayerX(page), { timeout: 2000 }).toBeGreaterThan(initialX!);
    } finally {
      await page.keyboard.up("ArrowRight");
    }

    expect(pageErrors.map((error) => error.message)).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("keeps melee and ranged fire independent through the real input bridge", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    page.on("pageerror", (e) => console.log("PAGEERROR_STACK>>>" + e.stack + "<<<"));
    await page.goto("/hitandrun");
    await waitForHitRunDebug(page);
    await expect.poll(() => readPlayerX(page)).not.toBeNull();

    expect(await readComboStep(page)).toBe("idle");
    expect(await readMeleePhase(page)).toBe("idle");

    await page.keyboard.down("c");
    try {
      await expect.poll(async () => (await readCombatInput(page))?.fireHeld).toBe(true);
      await expect.poll(() => readWeaponCooldown(page), { timeout: 2000 }).toBeGreaterThan(0);
      await expect.poll(() => readActiveProjectiles(page), { timeout: 2000 }).toBeGreaterThan(0);
      expect((await readCombatInput(page))?.attackHeld).toBe(false);
      expect(await readComboStep(page)).toBe("idle");
      expect(await readMeleePhase(page)).toBe("idle");
    } finally {
      await page.keyboard.up("c");
    }

    await page.keyboard.down("f");
    try {
      await expect.poll(async () => (await readCombatInput(page))?.attackHeld).toBe(true);
      await page.waitForTimeout(300);
      await expect.poll(() => readComboStep(page), { timeout: 8000 }).toBe("jab1");
      expect((await readCombatInput(page))?.fireHeld).toBe(false);
    } finally {
      await page.keyboard.up("f");
    }

    expect(pageErrors.map((error) => error.message)).toEqual([]);
  });

  test("keeps spawned enemies combat-capable after the wave spawn timeline completes", async ({ page }) => {
    page.on("pageerror", (e) => console.log("PAGEERROR_STACK>>>" + e.stack + "<<<"));
    await page.goto("/hitandrun");
    await waitForHitRunDebug(page);

    await expect.poll(
      () => readWaveState(page),
      { timeout: 8000, intervals: [100, 250, 500] }
    ).toMatchObject({
      hasDirector: true,
      hasScript: true,
      scriptMatches: true,
      hasEnemyPool: true,
      active: true,
      eventCount: 4
    });

    const startedWave = await readWaveState(page);
    expect(startedWave?.scriptId).toMatch(/^wave_goblins_s\d+$/);
    expect(startedWave?.sectionIndex).toBe(0);

    // The section-0 wave script ends at t = 11.5 s of simulation time. A player
    // that stands still loses its last hit point at ~6.7 s, and the death flow
    // then recreates the World, which restarts the wave director from zero, so
    // the timeline could never be observed as complete. Holding ArrowLeft keeps
    // the real input bridge moving the player away from the incoming pack; the
    // scenario still fails if the input bridge or the wave director regress.
    await page.keyboard.down("ArrowLeft");
    try {
      await expect.poll(
        async () => readWaveState(page),
        { timeout: 22000, intervals: [100, 250, 500] }
      ).toMatchObject({ spawnComplete: true });
    } finally {
      await page.keyboard.up("ArrowLeft");
    }

    const wave = await readWaveState(page);
    expect(wave).not.toBeNull();
    expect(wave?.scriptId).toMatch(/^wave_goblins_s\d+$/);
    expect(wave?.active).toBe(true);
    expect(wave?.loop).toBe(false);
    expect(wave?.expectedSpawnCount).toBeGreaterThan(0);
    expect(wave?.totalSpawned).toBe(wave?.expectedSpawnCount);
    expect(wave?.failedSpawnCount).toBe(0);
    expect(wave?.pendingSpawnCount).toBe(0);
    expect(await readWaveOwnedEnemies(page)).toBeGreaterThan(0);
    expect(await readWaveCombatableEnemies(page)).toBeGreaterThan(0);
    expect(await readAliveEnemies(page)).toBeGreaterThan(0);
    expect(await readCombatableEnemies(page)).toBeGreaterThan(0);
  });

  test("runs death slow motion once and restores a playable world after restart", async ({ page }) => {
    test.setTimeout(100000);
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    page.on("pageerror", (e) => console.log("PAGEERROR_STACK>>>" + e.stack + "<<<"));
    await page.goto("/hitandrun");
    await waitForHitRunDebug(page);

    // Let the ordinary wave/AI/combat pipeline defeat the stationary player.
    // The slow-motion window is only 450 ms wide and the UI recreates the World
    // right after it, so the death counter and the time scale have to be read
    // in the same round trip that observes the death flow. Two separate reads
    // can land in two different Worlds and observe a reset death counter.
    const firstDeath: { deaths: number; timeScale: number } = { deaths: 0, timeScale: 1 };
    await expect.poll(async () => {
      const snapshot = await readDeathObservation(page);
      if (snapshot.active) {
        firstDeath.deaths = snapshot.deaths;
        firstDeath.timeScale = snapshot.timeScale;
      }
      return snapshot.active;
    }, { timeout: 60000, intervals: [50, 100, 200] }).toBe(true);

    expect(firstDeath.deaths).toBeGreaterThan(0);
    expect(firstDeath.timeScale).toBeCloseTo(0.28, 2);

    // UI consumes requestRestart and BaseGame creates a fresh World/EventBus.
    await expect.poll(() => readTimeScale(page), { timeout: 7000 }).toBe(1);
    await expect.poll(() => readPlayerHealth(page), { timeout: 7000 }).toBe(5);
    await expect.poll(() => readPlayerX(page), { timeout: 7000 }).not.toBeNull();
    await expect(page.locator("canvas").first()).toBeVisible();

    // Prove the fresh World is not only rendered but accepting input and advancing.
    const restartedX = await readPlayerX(page);
    await page.keyboard.down("ArrowRight");
    try {
      await expect.poll(() => readPlayerX(page), { timeout: 2000 }).toBeGreaterThan(restartedX!);
    } finally {
      await page.keyboard.up("ArrowRight");
    }

    // A second full death cycle verifies that restart did not leave stale listeners,
    // a latched flow flag, or a residual TimeScale value behind.
    const secondDeath: { deaths: number; timeScale: number } = { deaths: 0, timeScale: 1 };
    await expect.poll(async () => {
      const snapshot = await readDeathObservation(page);
      if (snapshot.active) {
        secondDeath.deaths = snapshot.deaths;
        secondDeath.timeScale = snapshot.timeScale;
      }
      return snapshot.active;
    }, { timeout: 40000, intervals: [50, 100, 200] }).toBe(true);
    expect(secondDeath.deaths).toBe(1);
    expect(secondDeath.timeScale).toBeCloseTo(0.28, 2);
    await expect.poll(() => readTimeScale(page), { timeout: 7000 }).toBe(1);
    await expect.poll(() => readPlayerHealth(page), { timeout: 7000 }).toBe(5);

    expect(pageErrors.map((error) => error.message)).toEqual([]);
  });
});
