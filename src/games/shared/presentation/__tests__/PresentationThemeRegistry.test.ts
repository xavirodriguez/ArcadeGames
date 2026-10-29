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

function createTheme(
  descriptor: PresentationThemeDescriptor,
  onDispose: () => void = () => undefined
): TestTheme {
  return {
    descriptor,
    dispose: onDispose
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
  >("test-game", "default");

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
  test("creates a self-contained session for each selection", () => {
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

    const first = registry.createSession("sumi-e", context);
    const second = registry.createSession("sumi-e", {
      ...context,
      sessionId: "session-2"
    });

    expect(first).not.toBe(second);
    expect(first.theme).not.toBe(second.theme);
    expect(instances).toHaveLength(2);
    expect(first.descriptor.id).toBe("sumi-e");
    expect(first.tokens.colors.background).toBe("#111111");
    expect(first.sessionId).toBe("session-1");
    expect(second.sessionId).toBe("session-2");
    expect(first.disposed).toBe(false);
  });

  test("resolves presentation tokens per session without changing catalogue defaults", () => {
    const registry = createRegistry();
    registry.register({
      descriptor: {
        id: "variant",
        displayName: "Variant",
        capabilities: []
      },
      tokens: themeTokens,
      resolveTokens: (sessionContext) => {
        const accent = sessionContext.options?.accent;
        if (typeof accent !== "string") return themeTokens;
        return {
          ...themeTokens,
          colors: {
            ...themeTokens.colors,
            accent
          }
        };
      },
      create: () =>
        createTheme({
          id: "variant",
          displayName: "Variant",
          capabilities: []
        })
    });

    const session = registry.createSession("variant", {
      ...context,
      options: { accent: "#c0392b" }
    });

    expect(session.tokens.colors.accent).toBe("#c0392b");
    expect(registry.resolve("variant").definition.tokens.colors.accent).toBe("#4da3ff");
  });

  test("reports and preserves fallback metadata in the resolved session", () => {
    const registry = createRegistry();
    const session = registry.createSession("missing-theme", context);

    expect(session.requestedThemeId).toBe("missing-theme");
    expect(session.resolvedThemeId).toBe("default");
    expect(session.usedFallback).toBe(true);
    expect(session.descriptor.id).toBe("default");
  });

  test("fails clearly when the fallback has not been registered", () => {
    const registry = new PresentationThemeRegistry<
      SceneSnapshot,
      EntitySnapshot,
      FeedbackEvent,
      HudSnapshot,
      BannerSnapshot
    >("test-game", "missing-default");

    expect(() => registry.resolve("missing-theme")).toThrow(
      "fallback 'missing-default' is missing"
    );
  });

  test("rejects a context belonging to another game", () => {
    const registry = createRegistry();
    const otherGameContext = { ...context, gameId: "other-game" };

    expect(() => registry.createSession("default", otherGameContext)).toThrow(
      "cannot create a theme for game 'other-game'"
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
    >("test-game", "invalid");

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

    expect(() => registry.createSession("invalid", context)).toThrow(
      "must declare capability 'entity' exactly when its matching method is implemented"
    );
  });

  test("disposes only the owned theme instance and only once", () => {
    const registry = createRegistry();
    let firstDisposals = 0;
    let secondDisposals = 0;

    registry.register({
      descriptor: {
        id: "custom",
        displayName: "Custom",
        capabilities: []
      },
      tokens: themeTokens,
      create: ({ sessionId }) =>
        createTheme(
          { id: "custom", displayName: "Custom", capabilities: [] },
          () => {
            if (sessionId === "session-1") firstDisposals++;
            else secondDisposals++;
          }
        )
    });

    const first = registry.createSession("custom", context);
    const second = registry.createSession("custom", { ...context, sessionId: "session-2" });

    first.dispose();
    first.dispose();

    expect(first.disposed).toBe(true);
    expect(second.disposed).toBe(false);
    expect(firstDisposals).toBe(1);
    expect(secondDisposals).toBe(0);

    second.dispose();
    expect(secondDisposals).toBe(1);
  });
});
