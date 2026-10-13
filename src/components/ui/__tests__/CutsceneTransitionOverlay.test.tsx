import React from "react";
import { TransitionRegistry } from "@tiny-aster/core";
import {
  CUTSCENE_TRANSITION_MAP,
  resolveCutsceneTransitionProfile,
  clearWarnedUnknownEffects
} from "../CutsceneTransitionMap";

describe("CutsceneTransitionMap & Overlay Tests", () => {
  beforeEach(() => {
    clearWarnedUnknownEffects();
    jest.restoreAllMocks();
  });

  it("covers all keys in TransitionRegistry in CUTSCENE_TRANSITION_MAP", () => {
    const registryKeys = Object.keys(TransitionRegistry);
    registryKeys.forEach((key) => {
      expect(key in CUTSCENE_TRANSITION_MAP).toBe(true);
      const profile = CUTSCENE_TRANSITION_MAP[key as keyof typeof CUTSCENE_TRANSITION_MAP];
      expect(profile).toBeDefined();
      expect(profile.durationMs).toBeLessThanOrEqual(600);
    });
  });

  it("resolves valid transition effect key or class name alias", () => {
    const fadeProfile = resolveCutsceneTransitionProfile("fade");
    expect(fadeProfile.key).toBe("fade");

    const crtProfile = resolveCutsceneTransitionProfile("CRTGlitchTransition");
    expect(crtProfile.key).toBe("crt");

    const dangerProfile = resolveCutsceneTransitionProfile("danger");
    expect(dangerProfile.key).toBe("danger");
  });

  it("handles cutscene without transition effect by returning default fade profile", () => {
    const defaultProfile = resolveCutsceneTransitionProfile(undefined);
    expect(defaultProfile.key).toBe("fade");
  });

  it("warns once on unknown effect and falls back to fade profile", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const unknownProfile1 = resolveCutsceneTransitionProfile("UnknownGlitch3000");
    expect(unknownProfile1.key).toBe("fade");
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Call again with same unknown effect name -> should not trigger second console.warn
    const unknownProfile2 = resolveCutsceneTransitionProfile("UnknownGlitch3000");
    expect(unknownProfile2.key).toBe("fade");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
