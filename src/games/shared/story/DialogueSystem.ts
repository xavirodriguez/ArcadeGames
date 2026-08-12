import { System, World, ComponentRegistry } from "@tiny-aster/core";
import { DialogueBoxComponent } from "./DialogueBoxComponent";

/**
 * DialogueSystem processes typewriter timing and handles input advancing for DialogueBoxComponent.
 * @public
 */
export class DialogueSystem<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends Record<string, any> = Record<string, any>
> extends System<TComponents, TEvents> {

  public update(world: World<TComponents, TEvents>, deltaTime: number): void {
    const dialogs = world.query("DialogueBox" as any);
    const eventBus = world.getEventBus();

    for (const entity of dialogs) {
      const dialogue = world.getComponent(entity, "DialogueBox" as any) as any as DialogueBoxComponent;
      if (!dialogue) continue;

      const currentLine = dialogue.lines[dialogue.currentLineIndex];
      if (!currentLine) {
        // No lines left or empty lines, close dialogue box
        world.getCommandBuffer().removeComponent(entity, "DialogueBox" as any);
        if (eventBus) {
          eventBus.emit("dialogue:completed" as any, {});
        }
        continue;
      }

      // 1. Update Typewriter Time
      let elapsed = dialogue.elapsedTime + deltaTime;
      const totalCharsNeeded = currentLine.length;
      const charsTyped = Math.floor(elapsed * dialogue.typingSpeed);
      const isFinished = charsTyped >= totalCharsNeeded;

      world.mutateComponent(entity, "DialogueBox" as any, (d: any) => {
        d.elapsedTime = elapsed;
        d.isLineFinished = isFinished;
      });

      // 2. Check for advance input
      const advancePressed = this.isAdvanceInputPressed(world, dialogue.advanceKey);
      if (advancePressed) {
        if (!isFinished) {
          // Skip typewriter animation and show full line immediately
          world.mutateComponent(entity, "DialogueBox" as any, (d: any) => {
            d.elapsedTime = totalCharsNeeded / dialogue.typingSpeed;
            d.isLineFinished = true;
          });
        } else {
          // Advance to next line
          const nextIndex = dialogue.currentLineIndex + 1;
          if (nextIndex >= dialogue.lines.length) {
            world.getCommandBuffer().removeComponent(entity, "DialogueBox" as any);
            if (eventBus) {
              eventBus.emit("dialogue:completed" as any, {});
            }
          } else {
            world.mutateComponent(entity, "DialogueBox" as any, (d: any) => {
              d.currentLineIndex = nextIndex;
              d.elapsedTime = 0;
              d.isLineFinished = false;
            });
            if (eventBus) {
              eventBus.emit("dialogue:line_advanced" as any, { index: nextIndex, line: dialogue.lines[nextIndex] });
            }
          }
        }
      }
    }
  }

  private isAdvanceInputPressed(world: World<TComponents, TEvents>, advanceKey?: string): boolean {
    // Check key in input state
    const inputEntity = world.query("Input" as any)[0];
    if (inputEntity !== undefined) {
      const input = world.getComponent(inputEntity, "Input" as any) as any;
      if (input && advanceKey && input[advanceKey] === true) {
        return true;
      }
    }

    const platformerInputEntity = world.query("PlatformerInput" as any)[0];
    if (platformerInputEntity !== undefined) {
      const pInput = world.getComponent(platformerInputEntity, "PlatformerInput" as any) as any;
      if (pInput && pInput.jumpPressed) {
        return true;
      }
    }

    return false;
  }
}
