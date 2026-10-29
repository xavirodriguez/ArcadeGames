import { World } from "@tiny-aster/core";
import {
  createHitRunPresentationSession,
  getHitRunPresentationSession,
  getHitRunTheme,
  resizeHitRunPresentationSession,
  HIT_RUN_PRESENTATION_SESSION_RESOURCE
} from "../HitRunPresentationSession";

function createSessionWorld(session: ReturnType<typeof createHitRunPresentationSession>): World {
  const world = new World();
  world.setResource(HIT_RUN_PRESENTATION_SESSION_RESOURCE, session);
  return world;
}

describe("HitRunPresentationSession", () => {
  test("uses the shared registry and isolates theme instances and tokens", () => {
    const first = createHitRunPresentationSession("sumi-e", "session-a", 1234);
    const second = createHitRunPresentationSession("sumi-e", "session-b", 9876);

    expect(first).not.toBe(second);
    expect(first.theme).not.toBe(second.theme);
    expect(first.sessionId).toBe("session-a");
    expect(second.sessionId).toBe("session-b");
    expect(first.resolvedThemeId).toBe("sumi-e");
    expect(first.tokens.colors.background).toBe(first.tokens.custom.background);
    expect(second.tokens.colors.background).toBe(second.tokens.custom.background);

    first.dispose();
    expect(first.disposed).toBe(true);
    expect(second.disposed).toBe(false);
    second.dispose();
  });

  test("disposes only its own legacy renderer theme and is idempotent", () => {
    const session = createHitRunPresentationSession("sumi-e", "session-dispose", 77);
    const legacyTheme = getHitRunTheme(createSessionWorld(session));
    const dispose = jest.spyOn(legacyTheme, "dispose");

    session.dispose();
    session.dispose();

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  test("resolves the same legacy theme through the world's session", () => {
    const session = createHitRunPresentationSession("sumi-e", "session-world", 77);
    const world = createSessionWorld(session);
    const resolvedTheme = getHitRunTheme(world);

    expect(getHitRunPresentationSession(world)).toBe(session);
    expect(getHitRunTheme(world)).toBe(resolvedTheme);
    session.dispose();
  });

  test("notifies its theme once per distinct valid viewport", () => {
    const session = createHitRunPresentationSession("sumi-e", "session-resize", 50);
    const world = createSessionWorld(session);
    const onResize = jest.spyOn(getHitRunTheme(world), "onResize");

    resizeHitRunPresentationSession(world, 800, 600);
    resizeHitRunPresentationSession(world, 800, 600);
    resizeHitRunPresentationSession(world, 1024, 768);

    expect(onResize).toHaveBeenCalledTimes(2);
    expect(onResize).toHaveBeenNthCalledWith(1, 800, 600);
    expect(onResize).toHaveBeenNthCalledWith(2, 1024, 768);
    session.dispose();
  });

  test("requires an active session resource instead of a global fallback", () => {
    const world = new World();
    expect(() => getHitRunPresentationSession(world)).toThrow("World has no active presentation session.");
  });
});
