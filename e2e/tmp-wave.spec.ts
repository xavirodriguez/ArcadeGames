import { test } from "@playwright/test";

test("wave timeline rate", async ({ page }) => {
  test.setTimeout(180000);
  page.on("pageerror", (e) => console.log("PAGEERROR>>>" + e.message + "<<<"));

  await page.goto("/hitandrun");
  await page.waitForFunction(
    () => typeof (window as any).__hitAndRunDebug?.getWaveState === "function",
    undefined,
    { timeout: 90000 }
  );

  const t0 = Date.now();
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000);
    const s = await page.evaluate(() => {
      const d = (window as any).__hitAndRunDebug;
      const w = d.getWaveState();
      return {
        elapsed: w.elapsed,
        nextEventIndex: w.nextEventIndex,
        eventCount: w.eventCount,
        totalSpawned: w.totalSpawned,
        expected: w.expectedSpawnCount,
        pending: w.pendingSpawnCount,
        failed: w.failedSpawnCount,
        active: w.active,
        scriptId: w.scriptId,
        enemies: d.getAliveEnemyCount(),
        x: d.getPlayerX(),
      };
    });
    console.log(
      "T+" + (Date.now() - t0) + ">>>" + JSON.stringify(s) + "<<<"
    );
  }
});
