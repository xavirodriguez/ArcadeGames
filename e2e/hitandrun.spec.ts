import { test, expect } from "@playwright/test";

interface HitRunE2EDebug {
  getPlayerX: () => number | null;
  getPlayerHealth: () => number | null;
  getAliveEnemyCount: () => number;
  getCombatableEnemyCount: () => number;
  getWaveState: () => {
    scriptId: string | null;
    active: boolean;
    elapsed: number;
    nextEventIndex: number;
    eventCount: number;
    pendingSpawnCount: number;
    totalSpawned: number;
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
const readWaveState = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getWaveState() ?? null);
const readDeathFlow = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getDeathFlowState() ?? null);
const readTimeScale = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getTimeScale() ?? 1);
const readRunDeaths = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__hitAndRunDebug?.getRunDeaths() ?? 0);
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
    page.on("pageerror", (error) => pageErrors.push(error));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

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
      await expect.poll(() => readComboStep(page), { timeout: 2000 }).toBe("jab1");
      expect((await readCombatInput(page))?.fireHeld).toBe(false);
    } finally {
      await page.keyboard.up("f");
    }

    expect(pageErrors.map((error) => error.message)).toEqual([]);
  });

  test("keeps spawned enemies combat-capable after the wave spawn timeline completes", async ({ page }) => {
    await page.goto("/hitandrun");
    await waitForHitRunDebug(page);

    await expect.poll(() => readAliveEnemies(page), { timeout: 8000 }).toBeGreaterThan(0);
    await expect.poll(
      async () => (await readWaveState(page))?.spawnComplete,
      { timeout: 22000, intervals: [100, 250, 500] }
    ).toBe(true);

    const wave = await readWaveState(page);
    expect(wave).not.toBeNull();
    expect(wave?.loop).toBe(false);
    expect(wave?.totalSpawned).toBeGreaterThan(0);
    expect(wave?.pendingSpawnCount).toBe(0);
    expect(await readAliveEnemies(page)).toBeGreaterThan(0);
    expect(await readCombatableEnemies(page)).toBeGreaterThan(0);
  });

  test("runs death slow motion once and restores a playable world after restart", async ({ page }) => {
    test.setTimeout(55000);
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.goto("/hitandrun");
    await waitForHitRunDebug(page);

    // Let the ordinary wave/AI/combat pipeline defeat the stationary player.
    await expect.poll(
      async () => (await readDeathFlow(page))?.active,
      { timeout: 40000, intervals: [50, 100, 200] }
    ).toBe(true);

    const deathsDuringFlow = await readRunDeaths(page);
    expect(deathsDuringFlow).toBeGreaterThan(0);
    expect(await readTimeScale(page)).toBeCloseTo(0.28, 2);

    // UI consumes requestRestart and BaseGame creates a fresh World/EventBus.
    await expect.poll(() => readTimeScale(page), { timeout: 7000 }).toBe(1);
    await expect.poll(() => readPlayerHealth(page), { timeout: 7000 }).toBe(5);
    await expect.poll(() => readPlayerX(page), { timeout: 7000 }).not.toBeNull();
    await expect(page.locator("canvas").first()).toBeVisible();

    expect(pageErrors.map((error) => error.message)).toEqual([]);
  });
});
