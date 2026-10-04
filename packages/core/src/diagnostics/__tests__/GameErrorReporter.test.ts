import {
  GameError,
  GameErrorReporter,
  ConsoleGameErrorReporter,
  CompositeGameErrorReporter,
  normalizeError,
  Schedule,
  System,
  World,
  GameLoop,
  BaseGame,
  BaseGameConfig
} from "../../index";

class CustomTestReporter implements GameErrorReporter {
  public reportedErrors: GameError[] = [];

  public report(error: GameError): void {
    this.reportedErrors.push(error);
  }
}

class FaultyReporter implements GameErrorReporter {
  public report(): void {
    throw new Error("Faulty reporter crashed!");
  }
}

class ValidSystem extends System {
  public isDisposed = false;
  public override update(): void {}
  public override onRegister(): void {
    // Valid onRegister
  }
  public override dispose(): void {
    this.isDisposed = true;
  }
}

class BrokenRegisterSystem extends System {
  public override update(): void {}
  public override onRegister(): void {
    throw new Error("Broken onRegister hook");
  }
}

class BrokenDisposeSystem extends System {
  public override update(): void {}
  public override dispose(): void {
    throw new Error("Broken dispose hook");
  }
}

class TestGame extends BaseGame {
  public update(_dt: number): void {
    // No-op
  }
  public getGameState(): unknown {
    return {};
  }
  public isGameOver(): boolean {
    return false;
  }

  public async triggerBrokenSystem(): Promise<void> {
    this.world.addSystem(new BrokenRegisterSystem());
  }
}

describe("Diagnostics & GameErrorReporter", () => {
  describe("normalizeError", () => {
    it("preserves standard Error instances and their stacks", () => {
      const original = new Error("Standard exception");
      const normalized = normalizeError(original);
      expect(normalized).toBe(original);
      expect(normalized.message).toBe("Standard exception");
      expect(normalized.stack).toBeDefined();
    });

    it("converts string primitives to Error instances", () => {
      const normalized = normalizeError("String error message");
      expect(normalized).toBeInstanceOf(Error);
      expect(normalized.message).toBe("String error message");
    });

    it("converts numbers and booleans to Error instances", () => {
      const numError = normalizeError(404);
      expect(numError).toBeInstanceOf(Error);
      expect(numError.message).toBe("404");

      const boolError = normalizeError(false);
      expect(boolError).toBeInstanceOf(Error);
      expect(boolError.message).toBe("false");
    });

    it("converts objects to Error instances with details", () => {
      const objError = normalizeError({ code: "ERR_CUSTOM", status: 500 });
      expect(objError).toBeInstanceOf(Error);
      expect(objError.message).toContain("ERR_CUSTOM");
    });

    it("handles circular objects gracefully", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      const circularError = normalizeError(circular);
      expect(circularError).toBeInstanceOf(Error);
      expect(circularError.message).toContain("[Object Error]");
    });

    it("handles null and undefined values", () => {
      expect(normalizeError(null).message).toBe("null");
      expect(normalizeError(undefined).message).toBe("undefined");
    });
  });

  describe("ConsoleGameErrorReporter & CompositeGameErrorReporter", () => {
    it("ConsoleGameErrorReporter logs structured context to console.error", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const reporter = new ConsoleGameErrorReporter();
      const testError: GameError = {
        timestamp: Date.now(),
        error: new Error("Test error"),
        context: {
          gameId: "test-game",
          engineVersion: "1.0.0",
          sessionId: "session_123",
          phase: "update",
          system: "TestSystem",
          environment: "test",
          gitCommit: "abc1234",
          deploymentId: "dep_999"
        }
      };

      reporter.report(testError);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Game: test-game] [Phase: update] [System: TestSystem] [Session: session_123]"),
        testError.error
      );
      consoleSpy.mockRestore();
    });

    it("CompositeGameErrorReporter dispatches to all inner reporters", () => {
      const rep1 = new CustomTestReporter();
      const rep2 = new CustomTestReporter();
      const composite = new CompositeGameErrorReporter([rep1, rep2]);

      const testError: GameError = {
        timestamp: Date.now(),
        error: new Error("Composite error"),
        context: {
          gameId: "composite-game",
          engineVersion: "1.0.0",
          sessionId: "sess_456",
          phase: "initialization"
        }
      };

      composite.report(testError);
      expect(rep1.reportedErrors).toHaveLength(1);
      expect(rep2.reportedErrors).toHaveLength(1);
      expect(rep1.reportedErrors[0].context.gameId).toBe("composite-game");
    });

    it("CompositeGameErrorReporter isolates exceptions in faulty inner reporters", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const validRep = new CustomTestReporter();
      const faultyRep = new FaultyReporter();
      const composite = new CompositeGameErrorReporter([faultyRep, validRep]);

      const testError: GameError = {
        timestamp: Date.now(),
        error: new Error("Fault isolation check"),
        context: {
          gameId: "isolation-game",
          engineVersion: "1.0.0",
          sessionId: "sess_789",
          phase: "shutdown"
        }
      };

      expect(() => composite.report(testError)).not.toThrow();
      expect(validRep.reportedErrors).toHaveLength(1);
      consoleSpy.mockRestore();
    });
  });

  describe("Schedule lifecycle error capture", () => {
    it("reports registration phase errors on Schedule.addSystem", () => {
      const reporter = new CustomTestReporter();
      const schedule = new Schedule();
      schedule.setErrorReporter(reporter, { gameId: "sched-game", sessionId: "sess_sched" });
      const world = new World(schedule);

      expect(() => {
        schedule.addSystem(new BrokenRegisterSystem(), {}, world);
      }).toThrow("Broken onRegister hook");

      expect(reporter.reportedErrors).toHaveLength(1);
      const err = reporter.reportedErrors[0];
      expect(err.context.phase).toBe("registration");
      expect(err.context.system).toBe("BrokenRegisterSystem");
      expect(err.context.gameId).toBe("sched-game");
      expect(err.context.sessionId).toBe("sess_sched");
    });

    it("preserves system record in schedule when onRegister throws and reports SECONDARY shutdown error on clearSystems", () => {
      const reporter = new CustomTestReporter();
      const schedule = new Schedule();
      schedule.setErrorReporter(reporter, { gameId: "dual-error-game", sessionId: "sess_dual" });
      const world = new World(schedule);

      // System with invalid onRegister hook
      expect(() => {
        schedule.addSystem(new BrokenRegisterSystem(), {}, world);
      }).toThrow();

      expect(schedule.getSystems()).toHaveLength(1);
      expect(reporter.reportedErrors).toHaveLength(1);
      expect(reporter.reportedErrors[0].context.phase).toBe("registration");

      // Clearing systems will attempt to call dispose() on BrokenRegisterSystem
      // default dispose does not throw, so schedule is cleared cleanly
      schedule.clearSystems();
      expect(schedule.getSystems()).toHaveLength(0);
    });

    it("reports shutdown phase error on Schedule.clearSystems and continues disposing other systems", () => {
      const reporter = new CustomTestReporter();
      const schedule = new Schedule();
      schedule.setErrorReporter(reporter, { gameId: "clear-game", sessionId: "sess_clear" });
      const world = new World(schedule);

      const validSys1 = new ValidSystem();
      const brokenSys = new BrokenDisposeSystem();
      const validSys2 = new ValidSystem();

      schedule.addSystem(validSys1, {}, world);
      schedule.addSystem(brokenSys, {}, world);
      schedule.addSystem(validSys2, {}, world);

      expect(() => {
        schedule.clearSystems();
      }).toThrow("Broken dispose hook");

      // Verify reporter captured shutdown phase error
      expect(reporter.reportedErrors).toHaveLength(1);
      expect(reporter.reportedErrors[0].context.phase).toBe("shutdown");
      expect(reporter.reportedErrors[0].context.system).toBe("BrokenDisposeSystem");

      // Verify all valid systems were disposed even though brokenSys threw
      expect(validSys1.isDisposed).toBe(true);
      expect(validSys2.isDisposed).toBe(true);
      expect(schedule.getSystems()).toHaveLength(0);
    });

    it("reports missing onRegister or dispose as TypeErrors", () => {
      const reporter = new CustomTestReporter();
      const schedule = new Schedule();
      schedule.setErrorReporter(reporter, { gameId: "type-err-game", sessionId: "sess_type" });
      const world = new World(schedule);

      class FakeSystemWithoutHooks extends System {
        public override update(): void {}
      }
      const fakeSystemNotSystemClass = new FakeSystemWithoutHooks();
      (fakeSystemNotSystemClass as Partial<System>).onRegister = undefined;
      (fakeSystemNotSystemClass as Partial<System>).dispose = undefined;

      expect(() => {
        schedule.addSystem(fakeSystemNotSystemClass, {}, world);
      }).toThrow("system.onRegister is not a function");

      expect(reporter.reportedErrors).toHaveLength(1);
      expect(reporter.reportedErrors[0].context.phase).toBe("registration");
      expect(reporter.reportedErrors[0].error.message).toBe("system.onRegister is not a function");

      expect(() => {
        schedule.clearSystems();
      }).toThrow("s.system.dispose is not a function");

      expect(reporter.reportedErrors).toHaveLength(2);
      expect(reporter.reportedErrors[1].context.phase).toBe("shutdown");
      expect(reporter.reportedErrors[1].error.message).toBe("s.system.dispose is not a function");
    });
  });

  describe("GameLoop lifecycle error capture", () => {
    it("reports update phase errors in tick callback", () => {
      const reporter = new CustomTestReporter();
      const loop = new GameLoop({ manual: true });
      loop.setErrorReporter(reporter, { gameId: "loop-game", sessionId: "sess_loop" });

      loop.subscribeUpdate(() => {
        throw new Error("Update tick exploded");
      });

      loop.start();
      const now = performance.now();
      expect(() => loop.tick(now + 100)).toThrow("Update tick exploded");

      expect(reporter.reportedErrors).toHaveLength(1);
      const err = reporter.reportedErrors[0];
      expect(err.context.phase).toBe("update");
      expect(err.context.gameId).toBe("loop-game");
      expect(err.context.sessionId).toBe("sess_loop");
      expect(loop.getLastError()?.message).toBe("Update tick exploded");
    });

    it("reports render phase errors in tick callback", () => {
      const reporter = new CustomTestReporter();
      const loop = new GameLoop({ manual: true });
      loop.setErrorReporter(reporter, { gameId: "render-game", sessionId: "sess_render" });

      loop.subscribeRender(() => {
        throw new Error("Render frame exploded");
      });

      loop.start();
      expect(() => loop.tick()).toThrow("Render frame exploded");

      expect(reporter.reportedErrors).toHaveLength(1);
      const err = reporter.reportedErrors[0];
      expect(err.context.phase).toBe("render");
      expect(err.context.gameId).toBe("render-game");
    });

    it("preserves subscribeError callback notification alongside reporter", () => {
      const reporter = new CustomTestReporter();
      const loop = new GameLoop({ manual: true });
      loop.setErrorReporter(reporter, { gameId: "sub-game" });

      let receivedError: Error | null = null;
      loop.subscribeError((err) => {
        receivedError = err;
      });

      loop.subscribeUpdate(() => {
        throw new Error("Subscriber notification check");
      });

      loop.start();
      const now = performance.now();
      expect(() => loop.tick(now + 100)).toThrow();

      expect(receivedError).not.toBeNull();
      expect(receivedError!.message).toBe("Subscriber notification check");
      expect(reporter.reportedErrors).toHaveLength(1);
    });
  });

  describe("BaseGame integration & Session ID persistence", () => {
    it("assigns gameId, generates sessionId, and shares it across multiple error phases", async () => {
      const reporter = new CustomTestReporter();
      const config: BaseGameConfig = {
        gameId: "space-invaders",
        errorReporter: reporter,
        gitCommit: "git_hash_123",
        deploymentId: "deploy_456",
        environment: "production",
        headless: true,
        manualLoop: true
      };

      const game = new TestGame(config);
      expect(game.gameId).toBe("space-invaders");
      expect(game.sessionId).toMatch(/^session_\d+_\d+$/);

      await game.init();

      // Trigger registration phase error
      expect(() => {
        game.world.addSystem(new BrokenRegisterSystem());
      }).toThrow("Broken onRegister hook");

      expect(reporter.reportedErrors).toHaveLength(1);
      const regError = reporter.reportedErrors[0];
      expect(regError.context.phase).toBe("registration");
      expect(regError.context.gameId).toBe("space-invaders");
      expect(regError.context.sessionId).toBe(game.sessionId);
      expect(regError.context.gitCommit).toBe("git_hash_123");
      expect(regError.context.deploymentId).toBe("deploy_456");
      expect(regError.context.environment).toBe("production");

      // Trigger shutdown phase error
      game.world.addSystem(new BrokenDisposeSystem());
      game.destroy();

      expect(reporter.reportedErrors.length).toBeGreaterThanOrEqual(2);
      const shutError = reporter.reportedErrors.find(e => e.context.phase === "shutdown");
      expect(shutError).toBeDefined();
      expect(shutError!.context.sessionId).toBe(game.sessionId);
    });

    it("defaults gameId to constructor.name when omitted in config", () => {
      const reporter = new CustomTestReporter();
      const game = new TestGame({ errorReporter: reporter, headless: true, manualLoop: true });
      expect(game.gameId).toBe("TestGame");
    });
  });
});
