import { test, expect } from "@playwright/test";

const GAME_ROUTES = [
  { name: "Story Campaign", path: "/campaign" },
  { name: "Asteroids", path: "/asteroids" },
  { name: "Tower Defense", path: "/tower-defense" },
  { name: "Space Invaders", path: "/space-invaders" },
  { name: "Flappy Bird", path: "/flappybird" },
  { name: "Pong", path: "/pong" },
  { name: "Arkanoid", path: "/arkanoid" },
  { name: "Geometry Wars", path: "/geometrywars" },
  { name: "Hit and Run", path: "/hitandrun" },
  { name: "Echo Runner", path: "/echorunner" },
  { name: "Platformer", path: "/platformer" },
  { name: "Frogger", path: "/frogger" },
  { name: "CYOA", path: "/cyoa" },
  { name: "Blind Station", path: "/blindstation" },
  { name: "Out Run", path: "/outrun" },
  { name: "Racing", path: "/racing" },
  { name: "Centipede", path: "/centipede" },
  { name: "Vertical Shmup", path: "/vertical-shmup" },
];

test.describe("Game Launch Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Listen for unhandled errors / console errors
    page.on("pageerror", (error) => {
      console.error("Page error caught:", error.message);
    });
  });

  test("Main menu loads correctly", async ({ page }, testInfo) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for something characteristic of the main menu
    const titleOrButton = page
      .locator("text=/Arcade|Story Campaign|Campaña|Asteroids|Play/i")
      .first();

    await expect(titleOrButton).toBeVisible({ timeout: 15000 });

    // Ensure no unhandled JavaScript errors
    expect(
      pageErrors,
      `Unhandled errors on main menu: ${pageErrors.map((e) => e.message).join(", ")}`
    ).toHaveLength(0);

    // Capture screenshot for artifacts
    await page.screenshot({
      path: testInfo.outputPath("main_menu.png"),
      fullPage: true,
    });
  });

  for (const game of GAME_ROUTES) {
    test(`Can open, render, and interact with ${game.name} (${game.path}) without runtime crash`, async ({ page }, testInfo) => {
      const pageErrors: Error[] = [];
      const consoleErrors: string[] = [];

      page.on("pageerror", (err) => pageErrors.push(err));
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(game.path);
      await page.waitForTimeout(2500); // Wait for Expo Router / Skia / Canvas initialization

      // Perform initial gameplay interactions (keyboard presses / mouse clicks)
      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowLeft");
      await page.mouse.click(640, 360);
      await page.waitForTimeout(1000);

      // Check no unhandled JS errors occurred
      expect(pageErrors, `Unhandled errors on ${game.name}: ${pageErrors.map(e => e.message).join(", ")}`).toHaveLength(0);

      // Verify the canvas or main interactive element is visible
      const body = page.locator("body");
      await expect(body).toBeVisible();

      // Capture visual evidence screenshot for audit artifacts
      const screenshotPath = testInfo.outputPath(`${game.name.replace(/\s+/g, "_").toLowerCase()}_screenshot.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    });
  }

  test("Can navigate to Story Campaign by clicking on main menu button", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Click the Campaign button (Story Campaign or Campaña Historia depending on locale)
    const campaignBtn = page.locator("text=/Story Campaign|Campaña Historia/i").first();
    await expect(campaignBtn).toBeVisible({ timeout: 15000 });
    await campaignBtn.click();

    await page.waitForTimeout(2000);

    expect(pageErrors, `Unhandled errors opening Campaign from menu: ${pageErrors.map(e => e.message).join(", ")}`).toHaveLength(0);
  });
});
