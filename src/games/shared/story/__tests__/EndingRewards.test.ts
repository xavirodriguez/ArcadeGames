import { MetaProgressionService } from "@tiny-aster/core";
import { applyEndingRewards, ENDING_REWARDS_MAP } from "../EndingRewards";

describe("EndingRewards Declarative Mapping & Reward Application", () => {
  let metaService: MetaProgressionService;

  beforeEach(() => {
    metaService = new MetaProgressionService(undefined, undefined, false);
  });

  it("exports a non-empty ENDING_REWARDS_MAP with expected ending nodes", () => {
    expect(ENDING_REWARDS_MAP["ending_flawless"]).toEqual(["hyper_drift", "shield_pulse"]);
    expect(ENDING_REWARDS_MAP["ending_pyrrhic"]).toEqual(["hyper_drift", "shield_pulse"]);
  });

  it("applies modifier rewards to MetaProgressionService when endingId exists in map", () => {
    expect(metaService.getState().unlockedModifiers).not.toContain("hyper_drift");
    expect(metaService.getState().unlockedModifiers).not.toContain("shield_pulse");

    applyEndingRewards("ending_flawless", metaService);

    expect(metaService.getState().unlockedModifiers).toContain("hyper_drift");
    expect(metaService.getState().unlockedModifiers).toContain("shield_pulse");
  });

  it("does nothing when endingId is not present in ENDING_REWARDS_MAP", () => {
    const initialModifiers = [...metaService.getState().unlockedModifiers];

    applyEndingRewards("ending_unknown_node", metaService);

    expect(metaService.getState().unlockedModifiers).toEqual(initialModifiers);
  });
});
