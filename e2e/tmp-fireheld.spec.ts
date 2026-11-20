import { test } from "@playwright/test";

test("fireHeld contract", async ({ page }) => {
  test.setTimeout(180000);
  page.on("pageerror", (e) => console.log("PAGEERROR>>>" + e.message + "<<<"));

  await page.goto("/hitandrun");
  await page.waitForFunction(
    () => typeof (window as any).__hitAndRunDebug?.getCombatInput === "function",
    undefined,
    { timeout: 90000 }
  );

  const readRaw = () =>
    page.evaluate(() => {
      const d = (window as any).__hitAndRunDebug;
      const out = d.getCombatInput();
      return { hookCombat: out, hasHook: !!window.__hitAndRunDebug };
    });

  console.log("T0>>>" + JSON.stringify(await readRaw()) + "<<<");

  await page.keyboard.down("c");
  await page.waitForTimeout(400);
  console.log("T1_fireDown>>>" + JSON.stringify(await readRaw()) + "<<<");
  await page.keyboard.up("c");
  await page.waitForTimeout(400);
  console.log("T2_fireUp>>>" + JSON.stringify(await readRaw()) + "<<<");

  await page.keyboard.down("f");
  await page.waitForTimeout(400);
  console.log("T3_meleeDown>>>" + JSON.stringify(await readRaw()) + "<<<");
  await page.keyboard.up("f");
  await page.waitForTimeout(400);
  console.log("T4_meleeUp>>>" + JSON.stringify(await readRaw()) + "<<<");
});
