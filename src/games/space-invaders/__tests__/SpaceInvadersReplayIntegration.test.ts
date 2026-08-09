import { SpaceInvadersGame } from "../SpaceInvadersGame";

describe("SpaceInvadersGame Replay and Ghost Run Integration", () => {
  it("should record active inputs during gameplay and play them back deterministically", async () => {
    // 1. Create a game instance and prevent automatic start by overriding start() to a no-op
    const game = new SpaceInvadersGame({ headless: true });
    game.start = () => {};
    await game.init();

    game.startRecordingReplay();

    // 2. Set some inputs and update
    game.setInputState({ moveLeft: true, shoot: false });
    game.update(0.016); // tick 1

    game.setInputState({ moveLeft: false, shoot: true });
    game.update(0.016); // tick 2

    // 3. Stop recording and retrieve JSON
    const serialized = game.stopRecordingReplay();
    expect(serialized).toBeDefined();
    expect(serialized).toContain('"actions":["moveLeft"]');
    expect(serialized).toContain('"actions":["shoot"]');

    // 4. Start playback in a fresh game instance (override start() to a no-op to prevent racing)
    const playbackGame = new SpaceInvadersGame({ headless: true });
    playbackGame.start = () => {};
    await playbackGame.init();

    playbackGame.startPlaybackReplay(serialized!);

    // Verify first tick playback (should have moveLeft: true)
    playbackGame.update(0.016);
    const world1 = playbackGame.getWorld();
    const player1 = world1.query("Player")[0];
    const input1 = world1.getComponent(player1, "Input") as any;
    expect(input1.moveLeft).toBe(true);
    expect(input1.shoot).toBe(false);

    // Verify second tick playback (should have shoot: true)
    playbackGame.update(0.016);
    const world2 = playbackGame.getWorld();
    const player2 = world2.query("Player")[0];
    const input2 = world2.getComponent(player2, "Input") as any;
    expect(input2.moveLeft).toBe(false);
    expect(input2.shoot).toBe(true);

    playbackGame.stopPlaybackReplay();
  });
});
