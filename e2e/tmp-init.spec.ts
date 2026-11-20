import { test } from "@playwright/test";

test("init timing", async ({ page }) => {
  test.setTimeout(180000);
  page.on("console", (m) => {
    const t = m.text();
    console.log("T_LOG[" + m.type() + "]>>>" + t.slice(0, 300) + "<<<");
  });
  page.on("pageerror", (e) => console.log("PAGEERROR>>>" + e.stack + "<<<"));
  page.on("response", (r) => {
    if (r.status() >= 400) console.log("HTTP_" + r.status() + ">>>" + r.url() + "<<<");
  });

  await page.goto("/hitandrun");
  await page.waitForFunction(
    () => typeof (window as any).__hitAndRunDebug?.getPlayerX === "function",
    undefined,
    { timeout: 90000 }
  );
  console.log("T_LOG>>>hook ready<<<");
  await page.waitForTimeout(30000);
});
