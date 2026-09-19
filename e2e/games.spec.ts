import { test, expect } from "@playwright/test";

const GAME_ROUTES = [
  { name: "Story Campaign", path: "/campaign" },
  { name: "Asteroids", path: "/asteroids" },
  { name: "Space Invaders", path: "/space-invaders" },
  { name: "Flappy Bird", path: "/flappybird" },
  { name: "Pong", path: "/pong" },
  { name: "Arkanoid", path: "/arkanoid" },
  { name: "Geometry Wars", path: "/geometrywars" },
  { name: "Echo Runner", path: "/echorunner" },
  { name: "Platformer", path: "/platformer" },
  { name: "Frogger", path: "/frogger" },
  { name: "CYOA", path: "/cyoa" },
  { name: "Blind Station", path: "/blindstation" },
];

test.describe("Game Launch Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Listen for unhandled errors / console errors
    page.on("pageerror", (error) => {
      console.error("Page error caught:", error.message);
    });
  });

  test("Main menu loads correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Verify main menu title or buttons exist
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });

  for (const game of GAME_ROUTES) {
    test(`Can open and load ${game.name} (${game.path}) without runtime crash`, async ({ page }) => {
      const pageErrors: Error[] = [];
      page.on("pageerror", (err) => pageErrors.push(err));

      await page.goto(game.path);
      await page.waitForTimeout(2000); // Give simulation/UI time to initialize

      // Check no unhandled JS errors occurred
      expect(pageErrors, `Unhandled errors on ${game.name}: ${pageErrors.map(e => e.message).join(", ")}`).toHaveLength(0);

      // Verify the body was rendered and page didn't crash to blank white error screen
      const body = page.locator("body");
      await expect(body).toBeVisible();
    });
  }

  test("Can navigate to Story Campaign by clicking on main menu button", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click the Campaign button (Story Campaign or Campaña Historia depending on locale)
    const campaignBtn = page.locator('text=/Story Campaign|Campaña Historia/i').first();
    await expect(campaignBtn).toBeVisible();
    await campaignBtn.click();

    await page.waitForTimeout(2000);

    expect(pageErrors, `Unhandled errors opening Campaign from menu: ${pageErrors.map(e => e.message).join(", ")}`).toHaveLength(0);
  });
});
