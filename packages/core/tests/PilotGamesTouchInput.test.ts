import { TouchInputState } from "../src/input/TouchInputState";

describe("Pilot Games Touch Input Integration", () => {
  let touchState: TouchInputState;

  beforeEach(() => {
    touchState = new TouchInputState();
  });

  test("Pong input bridging reads TouchInputState button states", () => {
    touchState.setButton("p1Up", true);
    touchState.setButton("p1Down", false);

    const pongInput = {
      p1Up: touchState.getButton("p1Up"),
      p1Down: touchState.getButton("p1Down"),
    };

    expect(pongInput.p1Up).toBe(true);
    expect(pongInput.p1Down).toBe(false);
  });

  test("Flappy Bird input bridging reads TouchInputState flap state", () => {
    touchState.setButton("flap", true);

    const flappyInput = {
      flap: touchState.getButton("flap"),
    };

    expect(flappyInput.flap).toBe(true);
  });

  test("Asteroids input bridging reads joystick move axes and action buttons", () => {
    touchState.setMove(-0.8, -0.6); // Steering left + thrust up
    touchState.setButton("shoot", true);
    touchState.setButton("hyperspace", false);

    const asteroidsInput = {
      rotateLeft: touchState.moveX < -0.25,
      rotateRight: touchState.moveX > 0.25,
      thrust: touchState.moveY < -0.25,
      shoot: touchState.getButton("shoot"),
      hyperspace: touchState.getButton("hyperspace"),
    };

    expect(asteroidsInput.rotateLeft).toBe(true);
    expect(asteroidsInput.rotateRight).toBe(false);
    expect(asteroidsInput.thrust).toBe(true);
    expect(asteroidsInput.shoot).toBe(true);
    expect(asteroidsInput.hyperspace).toBe(false);
  });
});
