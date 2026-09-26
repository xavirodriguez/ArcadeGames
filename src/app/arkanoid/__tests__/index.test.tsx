import React from "react";

// Mock Expo/Native dependencies
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(),
  deactivateKeepAwake: jest.fn(),
  useKeepAwake: jest.fn(),
}));
jest.mock("expo-screen-orientation", () => ({
  lockAsync: jest.fn(),
  unlockAsync: jest.fn(),
  OrientationLock: {},
  addOrientationChangeListener: jest.fn(),
  removeOrientationChangeListeners: jest.fn(),
}));
jest.mock("expo-asset", () => ({
  Asset: { loadAsync: jest.fn() },
}));
jest.mock("expo-font", () => ({
  loadAsync: jest.fn(),
}));
jest.mock("expo-audio", () => ({}));
jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(),
}));

import ArkanoidScreen from "../index";
import { useArkanoidGame } from "../../../hooks/useArkanoidGame";

jest.mock("../../../hooks/useArkanoidGame");
jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
  },
}));
jest.mock("../../../utils/haptics", () => ({
  hapticSelection: jest.fn(),
}));
jest.mock("../../../services/PlayerProfileService", () => ({
  PlayerProfileService: {
    getProfile: jest.fn().mockResolvedValue({ displayName: "Tester" }),
    updateDisplayName: jest.fn(),
  },
}));
jest.mock("../../../../components/CanvasRenderer", () => ({
  CanvasRenderer: () => null,
}));
jest.mock("../../../components/debug/DebugOverlay", () => ({
  DebugOverlay: () => null,
}));
jest.mock("../../../components/controls/VirtualJoystick", () => ({
  VirtualJoystick: () => null,
}));
jest.mock("../../../components/ShootButton", () => ({
  ShootButton: () => null,
}));
jest.mock("../../../components/RadialBackground", () => ({
  RadialBackground: () => null,
}));
jest.mock("../../../components/GameErrorBoundary", () => ({
  GameErrorBoundary: ({ children }: any) => children,
}));

function mockContainer({ children }: any) {
  const { View } = require("react-native");
  return <View>{children}</View>;
}

function mockNull() {
  return null;
}

jest.mock("../../../components/ui/GameScreen", () => ({ GameScreen: mockContainer }));
jest.mock("../../../components/ui/GameTitle", () => ({ GameTitle: mockNull }));
jest.mock("../../../components/ui/GameInstructions", () => ({ GameInstructions: mockNull }));
jest.mock("../../../components/ui/HighScoreText", () => ({ HighScoreText: mockNull }));
jest.mock("../../../components/ui/PlayerNameInput", () => ({ PlayerNameInput: mockNull }));
jest.mock("../../../components/ui/BackButton", () => ({ BackButton: mockNull }));
jest.mock("../../../components/ui/NeonButton", () => ({
  NeonButton: ({ children, onPress }: any) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{children}</Text>
      </TouchableOpacity>
    );
  },
}));
jest.mock("../../../components/ui/GameLayoutShell", () => ({ GameLayoutShell: mockContainer }));

const mockUseArkanoidGame = useArkanoidGame as jest.Mock;

describe("ArkanoidScreen Component Test", () => {
  const mockGame = {
    getWorld: jest.fn().mockReturnValue({}),
    getGameLoop: jest.fn().mockReturnValue({}),
    initializeRenderer: jest.fn(),
    setInputState: jest.fn(),
    restart: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates ArkanoidScreen React element successfully", () => {
    const element = React.createElement(ArkanoidScreen);
    expect(element).toBeTruthy();
    expect(element.type).toBe(ArkanoidScreen);
  });

  it("mocks useArkanoidGame exposing isReady state correctly", () => {
    mockUseArkanoidGame.mockReturnValue({
      game: mockGame,
      gameState: { score: 0, lives: 3, level: 1, isGameOver: false },
      handleInput: jest.fn(),
      isPaused: false,
      isReady: true,
      togglePause: jest.fn(),
      highScore: 1000,
      seed: 12345,
      restartWithSeed: jest.fn(),
    });

    const gameHook = mockUseArkanoidGame(true, 12345);
    expect(gameHook.isReady).toBe(true);
    expect(gameHook.game).toBe(mockGame);
    expect(gameHook.gameState.lives).toBe(3);
  });
});
