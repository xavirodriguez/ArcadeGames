import { Scene } from "./Scene";
import { World } from "../ecs/World";

/**
 * CutsceneScene represents a narrative sequence playing out as lines of dialogues or scenes.
 * Reuses transitions via SceneManager.
 * @public
 */
export class CutsceneScene extends Scene {
  private lines: string[];
  private currentIndex: number = 0;
  private onCompleteCallback?: () => void;

  constructor(world: World, lines: string[], onComplete?: () => void) {
    super(world);
    this.name = "Cutscene Scene";
    this.lines = lines;
    this.onCompleteCallback = onComplete;
  }

  public override onEnter(world: World): void {
    this.currentIndex = 0;
    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emit("cutscene:started", { lines: this.lines });
    }
  }

  /**
   * Advances to the next line in the cutscene.
   * If there are no more lines, triggers completion.
   */
  public advance(): void {
    this.currentIndex++;
    if (this.currentIndex >= this.lines.length) {
      this.complete();
    } else {
      const eventBus = this.world.getEventBus();
      if (eventBus) {
        eventBus.emit("cutscene:line_advanced", { index: this.currentIndex, line: this.getCurrentLine() });
      }
    }
  }

  /**
   * Completes the cutscene and triggers transition/cleanup.
   */
  public complete(): void {
    const eventBus = this.world.getEventBus();
    if (eventBus) {
      eventBus.emit("cutscene:completed", {});
    }
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }

  /**
   * Gets the current active line's translation key.
   */
  public getCurrentLine(): string {
    return this.lines[this.currentIndex] || "";
  }

  /**
   * Gets the current index in the lines queue.
   */
  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Gets all lines of dialogue.
   */
  public getLines(): string[] {
    return this.lines;
  }
}
