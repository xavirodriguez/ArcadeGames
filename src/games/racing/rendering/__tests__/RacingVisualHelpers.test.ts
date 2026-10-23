import { resolveFinishCheckers, DEFAULT_FINISH_CHECKERS } from "../RacingVisualHelpers";

describe("resolveFinishCheckers unit tests", () => {
  it("returns DEFAULT_FINISH_CHECKERS when skin is undefined or finishCheckers is missing", () => {
    expect(resolveFinishCheckers(undefined)).toEqual(DEFAULT_FINISH_CHECKERS);
    expect(resolveFinishCheckers({})).toEqual(DEFAULT_FINISH_CHECKERS);
    expect(resolveFinishCheckers({ finishCheckers: [] })).toEqual(DEFAULT_FINISH_CHECKERS);
  });

  it("returns custom finishCheckers array when specified on skin", () => {
    const customCheckers: [string, string] = ["#00f0ff", "#ff007f"];
    expect(resolveFinishCheckers({ finishCheckers: customCheckers })).toEqual(customCheckers);
  });
});
