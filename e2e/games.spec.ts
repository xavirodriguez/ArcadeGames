import { test, expect } from "@playwright/test";

const ALL_GAME_ROUTES = [
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
] as const;

/** Critical paths exercised on every PR. Full catalogue runs only outside smoke mode. */
const SMOKE_GAME_PATHS = new Set([
  "/asteroids",
  "/space-invaders",
  "/hitandrun",
  "/pong",
]);

const isSmoke = process.env.E2E_SMOKE === "1" || process.env.E2E_SMOKE === "true";
const GAME_ROUTES = isSmoke
  ? ALL_GAME_ROUTES.filter((game) => SMOKE_GAME_PATHS.has(game.path))
  : [...ALL_GAME_ROUTES];

const CANVAS_KIT_TIMEOUT = isSmoke ? 12_000 : 20_000;
const VISIBLE_TIMEOUT = isSmoke ? 10_000 : 15_000;

test.describe(`Game Launch Test Suite${isSmoke ? " (smoke)" : ""}`, () => {
  test("Main menu loads correctly", async ({ page }, testInfo) => {
    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const titleOrButton = page
      .locator("text=/Arcade|Story Campaign|Campaña|Asteroids|Play/i")
      .first();

    await expect(titleOrButton).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    expect(
      pageErrors,
      `Unhandled errors on main menu: ${pageErrors.map((e) => e.message).join(", ")}`,
    ).toHaveLength(0);
    expect(
      consoleErrors,
      `Browser console errors on main menu: ${consoleErrors.join(", ")}`,
    ).toHaveLength(0);

    if (!isSmoke) {
      await page.screenshot({
        path: testInfo.outputPath("main_menu.png"),
        fullPage: true,
      });
    }
  });

  for (const game of GAME_ROUTES) {
    test(`Can open, render, and interact with ${game.name} (${game.path}) without runtime crash`, async ({
      page,
    }, testInfo) => {
      const pageErrors: Error[] = [];
      const consoleErrors: string[] = [];

      page.on("pageerror", (err) => pageErrors.push(err));
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(game.path, { waitUntil: "domcontentloaded" });

      await expect(page.getByText("Loading CanvasKit...")).toBeHidden({
        timeout: CANVAS_KIT_TIMEOUT,
      });

      const primaryElement = page.locator("canvas:visible, [role='button']:visible").first();
      await expect(primaryElement).toBeVisible({ timeout: VISIBLE_TIMEOUT });

      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowLeft");
      await page.mouse.click(640, 360);

      const body = page.locator("body");
      await expect(body).toBeVisible();

      expect(
        pageErrors,
        `Unhandled errors on ${game.name}: ${pageErrors.map((e) => e.message).join(", ")}`,
      ).toHaveLength(0);
      expect(
        consoleErrors,
        `Browser console errors on ${game.name}: ${consoleErrors.join(", ")}`,
      ).toHaveLength(0);

      if (!isSmoke) {
        const screenshotPath = testInfo.outputPath(
          `${game.name.replace(/\s+/g, "_").toLowerCase()}_screenshot.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }
    });
  }

  test("Can navigate to Story Campaign by clicking on main menu button", async ({ page }) => {
    test.skip(isSmoke, "Campaign navigation is covered by the full E2E suite");

    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Loading CanvasKit...")).toBeHidden({
      timeout: CANVAS_KIT_TIMEOUT,
    });

    const campaignBtn = page.locator("text=/Story Campaign|Campaña Historia/i").first();
    await expect(campaignBtn).toBeVisible({ timeout: VISIBLE_TIMEOUT });
    await campaignBtn.click();

    const campaignElement = page.locator("canvas:visible, [role='button']:visible").first();
    await expect(campaignElement).toBeVisible({ timeout: VISIBLE_TIMEOUT });

    expect(
      pageErrors,
      `Unhandled errors opening Campaign from menu: ${pageErrors.map((e) => e.message).join(", ")}`,
    ).toHaveLength(0);
    expect(
      consoleErrors,
      `Browser console errors opening Campaign: ${consoleErrors.join(", ")}`,
    ).toHaveLength(0);
  });
});
