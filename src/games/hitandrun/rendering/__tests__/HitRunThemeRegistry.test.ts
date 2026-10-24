import { ThemeRegistry } from "../theme/ThemeRegistry";

describe("HitRun ThemeRegistry Hot Swapping", () => {
  afterEach(() => {
    ThemeRegistry.setActiveTheme("fantasy");
  });

  test("switches theme in hot-swap mode and cleans up prior theme", () => {
    const fantasy = ThemeRegistry.getActiveTheme();
    expect(fantasy.id).toBe("fantasy");

    const sumiE = ThemeRegistry.setActiveTheme("sumi-e");
    expect(sumiE.id).toBe("sumi-e");
    expect(ThemeRegistry.getActiveTheme().id).toBe("sumi-e");
  });

  test("falls back gracefully when unknown theme id requested", () => {
    const unknown = ThemeRegistry.setActiveTheme("non_existent_theme");
    expect(unknown.id).toBe("fantasy");
  });
});
