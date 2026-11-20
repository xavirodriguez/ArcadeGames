import { test } from "@playwright/test";

test("player vitals", async ({ page }) => {
  test.setTimeout(180000);
  page.on("pageerror", (e) => console.log("PAGEERROR>>>" + e.message + "<<<"));

  await page.goto("/hitandrun");
  await page.waitForFunction(
    () => typeof (window as any).__hitAndRunDebug?.getWaveState === "function",
    undefined,
    { timeout: 90000 }
  );

  const t0 = Date.now();
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => {
      const d = (window as any).__hitAndRunDebug;
      const f = d.getDeathFlowState();
      return {
        x: d.getPlayerX(),
        hp: d.getPlayerHealth(),
        deaths: d.getRunDeaths(),
        flow: f,
        waveElapsed: d.getWaveState().elapsed,
        enemies: d.getAliveEnemyCount(),
      };
    });
    console.log("T+" + (Date.now() - t0) + ">>>" + JSON.stringify(s) + "<<<");
  }
});
