import type { PresentationFrame, PresentationPainter } from "../../../../shared/presentation/PresentationContracts";
import { createHitRunPresentationSession } from "../HitRunPresentationSession";
import type {
  HitRunPresentationBannerSnapshot,
  HitRunPresentationHudSnapshot
} from "../HitRunPresentationSnapshots";

function createPainter(): PresentationPainter {
  return {
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    setAlpha: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    bezierCurveTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillCircle: jest.fn(),
    fillEllipse: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 24, height: 14 })),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    drawImage: jest.fn(),
    clipRect: jest.fn()
  };
}

const frame: PresentationFrame = {
  frameId: 42,
  tick: 42,
  elapsedSeconds: 0.7,
  deltaSeconds: 0,
  viewport: { width: 800, height: 600, pixelRatio: 1 },
  camera: { x: 12, y: 24, zoom: 1, visualOffsetX: 0, visualOffsetY: 0 },
  reduceMotion: false,
  highContrast: false
};

const hud: HitRunPresentationHudSnapshot = {
  score: 1250,
  health: { current: 3, max: 5 },
  combo: 2,
  isGameOver: false,
  metrics: {
    weaponId: "longbow",
    ammoCurrent: 8,
    ammoMax: 12,
    cooldownRemaining: 0,
    wave: {
      sectionLabel: "DOJO",
      waveName: "First encounter",
      gateLocked: true,
      sectionCleared: false,
      aliveEnemies: 3,
      totalSpawned: 5
    },
    telegraphs: []
  }
};

const banner: HitRunPresentationBannerSnapshot = {
  text: "CLEAR",
  subtext: "Section complete",
  remainingSeconds: 0.25,
  totalDurationSeconds: 1.4
};

describe("HitRun PresentationPainter theme slice", () => {
  test.each(["fantasy", "sumi-e"])("%s renders HUD and banner through the backend-neutral painter", (themeId) => {
    const session = createHitRunPresentationSession(themeId, "hud-test", 1234);
    const painter = createPainter();
    const theme = session.theme;

    expect(theme.descriptor.capabilities).toEqual(expect.arrayContaining(["hud", "banner"]));
    expect(theme.renderHud).toBeDefined();
    expect(theme.renderBanner).toBeDefined();

    theme.renderHud?.(painter, hud, frame);
    theme.renderBanner?.(painter, banner, frame);

    if (themeId === "sumi-e") {
      expect(painter.fillCircle).toHaveBeenCalled();
    } else {
      expect(painter.createLinearGradient).toHaveBeenCalled();
      expect(painter.fillText).toHaveBeenCalledWith(
        "DOJO  ·  First encounter",
        400,
        16,
        expect.objectContaining({ align: "center" })
      );
    }
    expect(painter.fillRect).toHaveBeenCalled();
    expect(painter.strokeRect).toHaveBeenCalled();
    expect(painter.fillText).toHaveBeenCalledWith(
      themeId === "sumi-e" ? "全 滅" : "CLEAR",
      themeId === "sumi-e" ? 0 : 400,
      themeId === "sumi-e" ? 1 : 228,
      expect.objectContaining({ align: "center" })
    );
    const expectedStateScopes = themeId === "sumi-e" ? 4 : 2;
    expect(painter.save).toHaveBeenCalledTimes(expectedStateScopes);
    expect(painter.restore).toHaveBeenCalledTimes(expectedStateScopes);
    session.dispose();
  });

  test.each(["fantasy", "sumi-e"])("%s renders entities and projectiles through PresentationPainter", (themeId) => {
    const session = createHitRunPresentationSession(themeId, "entity-test-" + themeId, 51);
    const painter = createPainter();
    const entity = {
      entityId: "entity-1",
      visualId: "player",
      role: "player" as const,
      transform: { x: 120, y: 240, rotationRadians: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      elevation: 24,
      facing: -1 as const,
      hitFlash: 0,
      custom: {
        size: 24,
        depth: 240,
        isDead: false,
        samuraiWindup: false,
        samuraiAttack: false,
        shadowSizeMultiplier: 1
      }
    };

    expect(session.theme.descriptor.capabilities).toEqual(
      expect.arrayContaining(["ground-shadow", "entity", "projectile"])
    );
    session.theme.renderGroundShadow?.(painter, entity, frame);
    session.theme.renderEntity?.(painter, entity, frame);
    session.theme.renderProjectile?.(painter, { ...entity, role: "projectile", visualId: "bullet" }, frame);

    expect(painter.fillEllipse).toHaveBeenCalled();
    expect(painter.fillRect).toHaveBeenCalled();
    if (themeId === "fantasy") {
      expect(painter.fillCircle).toHaveBeenCalled();
    } else {
      expect(painter.fillText).toHaveBeenCalledWith(
        "封",
        0,
        expect.any(Number),
        expect.objectContaining({ align: "center" })
      );
    }
    expect(painter.save).toHaveBeenCalledTimes(3);
    expect(painter.restore).toHaveBeenCalledTimes(3);
    session.dispose();
  });

  test.each(["fantasy", "sumi-e"])("%s retains Samurai armor, katana and hit-flash overlay through the painter", (themeId) => {
    const session = createHitRunPresentationSession(themeId, "samurai-test-" + themeId, 71);
    const painter = createPainter();
    const samurai = {
      entityId: "samurai-1",
      visualId: "samurai",
      role: "hostile" as const,
      transform: { x: 200, y: 300, rotationRadians: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      elevation: 12,
      facing: 1 as const,
      hitFlash: 2,
      custom: {
        size: 32,
        depth: 300,
        isDead: false,
        samuraiState: "Windup",
        samuraiWindup: true,
        samuraiAttack: true,
        shadowSizeMultiplier: 1,
        shadowRxRatio: 0.42,
        shadowRyRatio: 0.12
      }
    };

    session.theme.renderEntity?.(painter, samurai, frame);

    expect(painter.stroke).toHaveBeenCalled();
    expect(painter.quadraticCurveTo).toHaveBeenCalled();
    expect(painter.fillEllipse).toHaveBeenLastCalledWith(
      0,
      -32 * 0.94,
      32 * 0.38,
      32 * 0.72,
      0,
      { color: "#ffffff", alpha: 0.35 }
    );
    session.dispose();
  });

  test("uses stable alpha when reduced motion is requested", () => {
    const session = createHitRunPresentationSession("sumi-e", "hud-reduced-motion", 9);
    const painter = createPainter();

    session.theme.renderBanner?.(painter, banner, { ...frame, reduceMotion: true });

    expect(painter.setAlpha).toHaveBeenCalledWith(1);
    session.dispose();
  });

  test("adds an explicit outline for high-contrast banner presentation", () => {
    const session = createHitRunPresentationSession("fantasy", "hud-high-contrast", 10);
    const painter = createPainter();

    session.theme.renderBanner?.(painter, banner, { ...frame, highContrast: true });

    expect(painter.strokeRect).toHaveBeenCalledWith(
      expect.objectContaining({ width: 180, height: 70 }),
      expect.objectContaining({ width: 3 })
    );
    session.dispose();
  });
});
