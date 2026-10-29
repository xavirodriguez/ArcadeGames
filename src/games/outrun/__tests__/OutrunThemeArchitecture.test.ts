import { resolveOutrunGameplayMod, resolveOutrunTheme, resolveVisualMod } from "../mods/registry";
import { classicMod } from "../mods/classic/ClassicMod";
import { classicTheme } from "../mods/classic/ClassicTheme";
import { classicGameplayMod } from "../mods/classic/ClassicGameplayMod";

describe("OutRun theme/gameplay separation", () => {
  it("retains one compatibility registry while resolving theme and gameplay independently", () => {
    expect(resolveVisualMod("classic")).toBe(classicMod);
    expect(resolveOutrunTheme("classic")).toBe(classicTheme);
    expect(resolveOutrunGameplayMod("classic")).toBe(classicGameplayMod);
    expect(resolveOutrunTheme("unknown")).toBe(classicTheme);
    expect(resolveOutrunGameplayMod("unknown")).toBe(classicGameplayMod);
    expect(classicMod.theme).toBe(classicTheme);
    expect(classicMod.gameplay).toBe(classicGameplayMod);
  });

  it("keeps renderer registration out of the gameplay module", () => {
    expect("registerDrawers" in classicTheme).toBe(true);
    expect("registerBackgroundEffects" in classicTheme).toBe(true);
    expect("registerDrawers" in classicGameplayMod).toBe(false);
    expect("resolveScenarioDecorKind" in classicGameplayMod).toBe(false);
  });

  it("preserves Classic's legacy deterministic roadside and traffic resolution", () => {
    expect(classicMod.resolveScenarioDecorKind("coast", 0.1)).toBe("lighthouse");
    expect(classicMod.resolveScenarioDecorKind("coast", 0.9)).toBe("palm");
    expect(classicMod.resolveRoadsideKind?.("cypress")).toBe("pine");
    expect(classicMod.resolveTrafficVehicleShape?.(0)).toBe("coupe");
    expect(classicMod.resolveTrafficVehicleShape?.(1)).toBe("van");
  });
});
