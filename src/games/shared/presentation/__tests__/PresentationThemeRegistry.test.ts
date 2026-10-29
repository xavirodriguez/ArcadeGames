import { PresentationThemeRegistry } from "../PresentationThemeRegistry";
import type {
  PresentationTheme,
  PresentationThemeContext,
  PresentationThemeDescriptor,
  PresentationThemeTokens
} from "../PresentationContracts";

interface SceneSnapshot {
  readonly levelId: string;
}

interface EntitySnapshot {
  readonly visualId: string;
}

interface FeedbackEvent {
  readonly type: "hit";
}

interface HudSnapshot {
  readonly score: number;
}

interface BannerSnapshot {
  readonly text: string;
}

type TestTheme = PresentationTheme<
  SceneSnapshot,
  EntitySnapshot,
  FeedbackEvent,
  HudSnapshot,
  BannerSnapshot
>;

const themeTokens: PresentationThemeTokens<object> = {
  colors: {
    background: "#111111",
    surface: "#222222",
    textPrimary: "#ffffff",
    textSecondary: "#cccccc",
    accent: "#4da3ff",
    player: "#4da3ff",
    threat: "#ff3b30",
    reward: "#e3a92f",
    danger: "#ff3b30",
    success: "#4a8a62",
    warning: "#e3a92f",
    outline: "#777777"
  },
  typography: {
    display: "sans-serif",
    body: "sans-serif",
    monospace: "monospace"
  },
  layout: {
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    radius: { sm: 2, md: 4, lg: 8, pill: 999 }
  },
  custom: {}
};

const context: PresentationThemeContext = {
  gameId: "test-game",
  sessionId: "session-1",
  cosmeticSeed: 42,
  random: { next: () => 0.5 }
};

function createTheme(descriptor: PresentationThemeDescriptor): TestTheme {
  return {
    descriptor,
    dispose: () => undefined
  };
}

function createRegistry(): PresentationThemeRegistry<
  SceneSnapshot,
  EntitySnapshot,
  FeedbackEvent,
  HudSnapshot,
  BannerSnapshot
> {
  const registry = new PresentationThemeRegistry<
    SceneSnapshot,
    EntitySnapshot,
    FeedbackEvent,
    HudSnapshot,
    BannerSnapshot
  >("default");

  registry.register({
    descriptor: {
      id: "default",
      displayName: "Default",
      capabilities: []
    },
    tokens: themeTokens,
    create: () =>
      createTheme({
        id: "default",
        displayName: "Default",
        capabilities: []
      })
  });

  return registry;
}

describe("PresentationThemeRegistry", () => {
  test("creates a new theme instance for every session", () => {
    const instances: TestTheme[] = [];
    const registry = createRegistry();

    registry.register({
      descriptor: {
        id: "sumi-e",
        displayName: "Sumi-e",
        capabilities: []
      },
      tokens: themeTokens,
      create: () => {
        const instance = createTheme({
          id: "sumi-e",
          displayName: "Sumi-e",
          capabilities: []
        });
        instances.push(instance);
        return instance;
      }
    });

    const first = registry.create("sumi-e", context);
    const second = registry.create("sumi-e", {
      ...context,
      sessionId: "session-2"
    });

    expect(first).not.toBe(second);
    expect(instances).toHaveLength(2);
    expect(first.descriptor.id).toBe("sumi-e");
    expect(second.descriptor.id).toBe("sumi-e");
  });

  test("exposes normalized theme tokens through the registry definition", () => {
    const registry = createRegistry();

    expect(registry.resolve("default").definition.tokens.colors.background).toBe("#111111");
    expect(registry.resolve("default").definition.tokens.typography.monospace).toBe("monospace");
  });

  test("reports an explicit fallback when a requested theme is not registered", () => {
    const registry = createRegistry();
    const resolution = registry.resolve("missing-theme");

    expect(resolution.requestedId).toBe("missing-theme");
    expect(resolution.resolvedId).toBe("default");
    expect(resolution.usedFallback).toBe(true);
  });

  test("fails clearly when the fallback has not been registered", () => {
    const registry = new PresentationThemeRegistry<
      SceneSnapshot,
      EntitySnapshot,
      FeedbackEvent,
      HudSnapshot,
      BannerSnapshot
    >("missing-default");

    expect(() => registry.resolve("missing-theme")).toThrow(
      "fallback 'missing-default' is missing"
    );
  });

  test("rejects duplicate theme ids instead of silently replacing a definition", () => {
    const registry = createRegistry();

    expect(() =>
      registry.register({
        descriptor: {
          id: "default",
          displayName: "Duplicate",
          capabilities: []
        },
        tokens: themeTokens,
        create: () =>
          createTheme({
            id: "default",
            displayName: "Duplicate",
            capabilities: []
          })
      })
    ).toThrow("already registered");
  });

  test("rejects a rendering capability that has no matching implementation", () => {
    const registry = new PresentationThemeRegistry<
      SceneSnapshot,
      EntitySnapshot,
      FeedbackEvent,
      HudSnapshot,
      BannerSnapshot
    >("invalid");

    registry.register({
      descriptor: {
        id: "invalid",
        displayName: "Invalid",
        capabilities: ["entity"]
      },
      tokens: themeTokens,
      create: () =>
        createTheme({
          id: "invalid",
          displayName: "Invalid",
          capabilities: ["entity"]
        })
    });

    expect(() => registry.create("invalid", context)).toThrow(
      "must declare capability 'entity' exactly when its matching method is implemented"
    );
  });
});
