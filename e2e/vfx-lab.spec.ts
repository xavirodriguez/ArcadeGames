import { test, expect } from "@playwright/test";

test.describe("VFX Visual Lab", () => {
  test("opens directly and renders its production effect browser", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await page.goto("/vfx-lab", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Loading CanvasKit...")).toBeHidden({ timeout: 20000 });
    await expect(page.getByText("VFX VISUAL LAB", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Renderer comparison", { exact: true })).toBeVisible();
    await expect(page.getByText("CANVAS 2D", { exact: true })).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByText("Effect browser", { exact: false })).toBeVisible();
    await expect(page.getByText("Parry", { exact: true })).toBeVisible();
    await expect(page.getByText("Perfect Block", { exact: true })).toBeVisible();
    await expect(page.getByText("Critical Hit", { exact: true })).toBeVisible();
    await expect(page.getByText("Projectile Deflection", { exact: true })).toBeVisible();
    await expect(page.getByText("Guard Break", { exact: true })).toBeVisible();
    await expect(page.getByText("Armor Break", { exact: true })).toBeVisible();
    await expect(page.getByText("Combo Finisher", { exact: true })).toBeVisible();

    expect(pageErrors, `Unhandled errors opening VFX Lab: ${pageErrors.join("; ")}`).toHaveLength(0);
  });

  test("is reachable from the main menu", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Loading CanvasKit...")).toBeHidden({ timeout: 20000 });
    await page.getByRole("button", { name: "Open VFX Visual Lab" }).click();
    await expect(page.getByText("VFX VISUAL LAB", { exact: true })).toBeVisible({ timeout: 15000 });
  });
});
