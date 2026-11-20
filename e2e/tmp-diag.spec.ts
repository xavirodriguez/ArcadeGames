import { test } from "@playwright/test";

test("diagnose init", async ({ page }) => {
  test.setTimeout(120000);
  page.on("pageerror", (e) => console.log("PAGEERROR>>>" + e.stack + "<<<"));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      console.log("CONSOLE_" + m.type() + ">>>" + m.text().slice(0, 300) + "<<<");
    }
  });
  page.on("response", (r) => {
    if (r.status() >= 400) console.log("HTTP_" + r.status() + ">>>" + r.url() + "<<<");
  });

  const t0 = Date.now();
  await page.goto("/hitandrun");
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => {
      const w = window as any;
      const d = w.__hitAndRunDebug;
      return {
        hasHook: !!d,
        playerX: d ? d.getPlayerX() : null,
        health: d ? d.getPlayerHealth() : null,
        hasDirector: d ? d.getWaveState().hasDirector : null,
        bodyText: (document.body.innerText || "").slice(0, 400),
      };
    });
    console.log("T+" + (Date.now() - t0) + ">>>" + JSON.stringify(state) + "<<<");
    if (state.playerX !== null && state.hasDirector) break;
  }
});
