import { test, expect } from "@playwright/test";

/**
 * E2E tests for Hit & Run player movement.
 *
 * NOTE: This E2E test complements (does not replace) the unit/simulation tests in
 * `src/games/hitandrun/__tests__/HitAndRun.test.ts`. While unit tests verify the ECS state
 * and movement physics directly in headless Jest, this test validates the entire runtime
 * integration pipeline: DOM keyboard listeners -> React component state -> ECS World -> render loop.
 */
test.describe("Hit and Run Real Player Movement E2E", () => {
  test("Player moves right in ECS world when ArrowRight key is pressed", async ({ page }) => {
    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];

    page.on("pageerror", (err) => pageErrors.push(err));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/hitandrun");

    // Wait until the debug hook becomes available (indicates React + ECS game ready)
    await page.waitForFunction(() => (window as any).__hitAndRunDebug != null, {
      timeout: 20000,
    });

    // Read initial player X position
    const initialX = await page.evaluate(() =>
      (window as any).__hitAndRunDebug.getPlayerX()
    );

    expect(typeof initialX).toBe("number");
    expect(initialX).not.toBeNull();

    // Simulate sustained movement to the right via browser keyboard
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(500);
    await page.keyboard.up("ArrowRight");

    // Give a brief frame interval for position update to settle
    await page.waitForTimeout(100);

    // Read updated player X position
    const finalX = await page.evaluate(() =>
      (window as any).__hitAndRunDebug.getPlayerX()
    );

    expect(typeof finalX).toBe("number");
    expect(finalX).toBeGreaterThan(initialX!);

    // Ensure no unhandled JavaScript runtime or page errors occurred during movement
    expect(
      pageErrors,
      `Unhandled errors: ${pageErrors.map((e) => e.message).join(", ")}`
    ).toHaveLength(0);
  });
});
