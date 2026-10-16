import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PlayerProfileService,
  PlayerProfileSchema,
  type PlayerProfile
} from "../PlayerProfileService";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  }
}));

const mockGetItem = jest.mocked(AsyncStorage.getItem);
const mockSetItem = jest.mocked(AsyncStorage.setItem);

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const storedProfile: PlayerProfile = {
  playerId: "123e4567-e89b-42d3-a456-426614174000",
  displayName: "PersistedPilot",
  xp: 450,
  level: 3,
  unlockedPalettes: ["palette_default"],
  activePalette: "palette_default",
  unlockedTrails: ["trail_default"],
  activeTrail: "trail_default",
  stats: {
    asteroidsDestroyed: 42,
    pipesPassed: 15,
    siKills: 120,
    pongSetsWon: 5,
    totalPlaytimeTicks: 12000,
    empActivations: 3,
    chargedShotsFired: 8
  },
  unlockedAchievements: [],
  storyChapterUnlocked: 1,
  storyFragmentsCollected: []
};

/** Clears the module-level cache so each test starts from a fresh "install". */
function resetServiceCache(): void {
  // The service memoizes its state in private static fields. Reset them through
  // `Reflect` so tests stay isolated without widening the public API.
  Reflect.set(PlayerProfileService, "profile", null);
  Reflect.set(PlayerProfileService, "loadPromise", null);
}

describe("PlayerProfileService identity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetServiceCache();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it("creates a default profile with a valid, persisted UUID v4", async () => {
    const profile = await PlayerProfileService.getProfile();

    expect(profile.playerId).toMatch(UUID_V4);
    expect(() => PlayerProfileSchema.parse(profile)).not.toThrow();
    expect(mockSetItem).toHaveBeenCalledTimes(1);
  });

  it("returns the same playerId on subsequent calls without re-persisting", async () => {
    const first = await PlayerProfileService.getProfile();
    const second = await PlayerProfileService.getProfile();

    expect(second.playerId).toBe(first.playerId);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent initialization into a single identity", async () => {
    const [a, b] = await Promise.all([
      PlayerProfileService.getProfile(),
      PlayerProfileService.getProfile()
    ]);

    expect(a.playerId).toBe(b.playerId);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
  });

  it("preserves the identity stored in a previous session", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(storedProfile));

    const profile = await PlayerProfileService.getProfile();

    expect(profile.playerId).toBe(storedProfile.playerId);
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
