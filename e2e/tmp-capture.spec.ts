import { test } from "@playwright/test";

test("capture pageerror stack", async ({ page }) => {
  test.setTimeout(240000);
  page.on("pageerror", (e) => {
    console.log("PAGEERROR_STACK_START>>>" + e.stack + "<<<PAGEERROR_STACK_END");
  });
  page.on("console", (m) => {
    console.log("CONSOLE_" + m.type() + ">>>" + m.text().slice(0, 600) + "<<<");
  });
  page.on("response", (r) => {
    if (r.status() >= 400) console.log("HTTP_" + r.status() + ">>>" + r.url() + "<<<");
  });

  const t0 = Date.now();
  await page.goto("/hitandrun");
  try {
    await page.waitForFunction(
      () => typeof (window as any).__hitAndRunDebug?.getPlayerX === "function",
      undefined,
      { timeout: 60000 }
    );
    console.log("DEBUG_HOOK_MS>>>" + (Date.now() - t0));
  } catch {
    console.log("DEBUG_HOOK_TIMEOUT>>>" + (Date.now() - t0));
  }

  await page.waitForTimeout(20000);
  console.log("OBSERVED_STATES", JSON.stringify(await page.evaluate(() => {
    const d = (window as any).__hitAndRunDebug;
    if (!d) return { debug: false };
    return {
      debug: true,
      wave: d.getWaveState(),
      playerX: d.getPlayerX(),
      health: d.getPlayerHealth(),
      deaths: d.getRunDeaths(),
      timeScale: d.getTimeScale(),
    };
  })));
});
