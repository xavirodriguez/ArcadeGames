import { ArcadeKernel, ArcadeState } from "../src/runtime/ArcadeKernel";
import { EventBus } from "../src/events/EventBus";

describe("ArcadeKernel State Machine", () => {
  it("should initialize in BOOT state and transition cleanly to loading", () => {
    const kernel = new ArcadeKernel();
    expect(kernel.getState()).toBe(ArcadeState.BOOT);

    const emitted: any[] = [];
    const eventBus = (kernel as any).eventBus as EventBus<any>;
    eventBus.on("arcade:state_changed" as any, (data: any) => {
      emitted.push(data);
    });

    kernel.transitionTo(ArcadeState.LOADING, { assetCount: 12 });
    expect(kernel.getState()).toBe(ArcadeState.LOADING);
    expect(emitted.length).toBe(1);
    expect(emitted[0].from).toBe(ArcadeState.BOOT);
    expect(emitted[0].to).toBe(ArcadeState.LOADING);
    expect(emitted[0].assetCount).toBe(12);
  });

  it("should throw an error for invalid transitions", () => {
    const kernel = new ArcadeKernel();
    // Cannot transition directly from BOOT to PLAYING
    expect(() => {
      kernel.transitionTo(ArcadeState.PLAYING);
    }).toThrow("[ArcadeKernel] Invalid transition: Cannot transition from BOOT to PLAYING");
  });

  it("should permit transitions between Playing and Paused and Game Over", () => {
    const kernel = new ArcadeKernel();

    // BOOT -> LOADING -> TITLE -> PLAYING -> PAUSED -> PLAYING -> GAME_OVER -> MENU
    kernel.transitionTo(ArcadeState.LOADING);
    kernel.transitionTo(ArcadeState.TITLE);
    kernel.transitionTo(ArcadeState.PLAYING);
    expect(kernel.getState()).toBe(ArcadeState.PLAYING);

    kernel.transitionTo(ArcadeState.PAUSED);
    expect(kernel.getState()).toBe(ArcadeState.PAUSED);

    kernel.transitionTo(ArcadeState.PLAYING);
    expect(kernel.getState()).toBe(ArcadeState.PLAYING);

    kernel.transitionTo(ArcadeState.GAME_OVER);
    expect(kernel.getState()).toBe(ArcadeState.GAME_OVER);

    kernel.transitionTo(ArcadeState.MENU);
    expect(kernel.getState()).toBe(ArcadeState.MENU);
  });
});
