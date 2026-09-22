import { System, World, ComponentRegistry, EventRegistry, EventBus } from "@tiny-aster/core";
import { DialogueBoxComponent } from "./DialogueBoxComponent";

/**
 * DialogueSystem processes typewriter timing and handles input advancing for DialogueBoxComponent.
 * @public
 */
export class DialogueSystem<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> extends System<TComponents, TEvents> {

  public update(world: World<TComponents, TEvents>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const dialogueType = "DialogueBox" as Extract<keyof TComponents, string>;
    const dialogs = world.query(dialogueType);
    const eventBus = world.getEventBus();

    for (const entity of dialogs) {
      const dialogue = world.getComponent(entity, dialogueType) as DialogueBoxComponent | undefined;
      if (!dialogue) continue;

      const currentLine = dialogue.lines[dialogue.currentLineIndex];
      if (!currentLine) {
        // No lines left or empty lines, close dialogue box
        world.getCommandBuffer().removeComponent(entity, dialogueType);
        if (eventBus) {
          (eventBus as unknown as { emit: (e: string, p?: unknown) => void }).emit("dialogue:completed", {});
        }
        continue;
      }

      // 1. Update Typewriter Time
      let elapsed = dialogue.elapsedTime + deltaTime;
      const totalCharsNeeded = currentLine.length;
      const charsTyped = Math.floor(elapsed * dialogue.typingSpeed);
      const isFinished = charsTyped >= totalCharsNeeded;

      world.mutateComponent(entity, dialogueType, (d: unknown) => {
        const db = d as DialogueBoxComponent;
        db.elapsedTime = elapsed;
        db.isLineFinished = isFinished;
      });

      // 2. Check for advance input
      const advancePressed = this.isAdvanceInputPressed(world, dialogue.advanceKey);
      if (advancePressed) {
        if (!isFinished) {
          // Skip typewriter animation and show full line immediately
          world.mutateComponent(entity, dialogueType, (d: unknown) => {
            const db = d as DialogueBoxComponent;
            db.elapsedTime = totalCharsNeeded / dialogue.typingSpeed;
            db.isLineFinished = true;
          });
        } else {
          // Advance to next line
          const nextIndex = dialogue.currentLineIndex + 1;
          if (nextIndex >= dialogue.lines.length) {
            world.getCommandBuffer().removeComponent(entity, dialogueType);
            if (eventBus) {
              (eventBus as unknown as { emit: (e: string, p?: unknown) => void }).emit("dialogue:completed", {});
            }
          } else {
            world.mutateComponent(entity, dialogueType, (d: unknown) => {
              const db = d as DialogueBoxComponent;
              db.currentLineIndex = nextIndex;
              db.elapsedTime = 0;
              db.isLineFinished = false;
            });
            if (eventBus) {
              (eventBus as unknown as { emit: (e: string, p?: unknown) => void }).emit("dialogue:line_advanced", { index: nextIndex, line: dialogue.lines[nextIndex] });
            }
          }
        }
      }
    }
  }

  private isAdvanceInputPressed(world: World<TComponents, TEvents>, advanceKey?: string): boolean {
    // Check key in input state
    const inputType = "Input" as Extract<keyof TComponents, string>;
    const inputEntity = world.query(inputType)[0];
    if (inputEntity !== undefined) {
      const input = world.getComponent(inputEntity, inputType) as Record<string, unknown> | undefined;
      if (input && advanceKey && input[advanceKey] === true) {
        return true;
      }
    }

    const platformerInputType = "PlatformerInput" as Extract<keyof TComponents, string>;
    const platformerInputEntity = world.query(platformerInputType)[0];
    if (platformerInputEntity !== undefined) {
      const pInput = world.getComponent(platformerInputEntity, platformerInputType) as { jumpPressed?: boolean } | undefined;
      if (pInput && pInput.jumpPressed) {
        return true;
      }
    }

    return false;
  }
}
