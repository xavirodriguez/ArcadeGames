import { World } from "@tiny-aster/core";

/**
 * Interface representing a narrative branch/choice option.
 * @public
 */
export interface StoryChoice {
  id: string;
  title: string;
  description: string;
  consequenceBeatId: string; // The StoryBeat ID that gets unlocked/affected by this choice
}

/**
 * Resource to manage active narrative choice options available for selection.
 * @public
 */
export class RunStoryChoices {
  public choices: StoryChoice[] = [];
  public active: boolean = false;
  public selectedChoiceId?: string;

  constructor(choices: StoryChoice[] = [], active: boolean = false) {
    this.choices = choices;
    this.active = active;
  }

  /**
   * Deterministically generates 3 story choice options using world.gameplayRandom.
   */
  public static generateChoices(world: World): RunStoryChoices {
    const random = world.gameplayRandom;
    // Predefined story options pool
    const pool: StoryChoice[] = [
      { id: "choice_aggressive", title: "Atacar la nave nodriza", description: "Enfrentar directamente a los opresores", consequenceBeatId: "beat_aggressive" },
      { id: "choice_stealth", title: "Infiltrarse silenciosamente", description: "Evitar el conflicto directo y hackear los datos", consequenceBeatId: "beat_stealth" },
      { id: "choice_diplomatic", title: "Establecer comunicación", description: "Intentar contactar a los alienígenas pacíficamente", consequenceBeatId: "beat_diplomatic" },
      { id: "choice_scavenge", title: "Recuperar restos del reactor", description: "Priorizar recolectar tecnología experimental", consequenceBeatId: "beat_scavenge" },
      { id: "choice_escape", title: "Huir del cuadrante", description: "Abandonar la zona de combate inmediatamente", consequenceBeatId: "beat_escape" }
    ];

    // Select 3 unique options deterministically
    const selected: StoryChoice[] = [];
    const poolCopy = [...pool];

    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(random.next() * poolCopy.length);
      selected.push(poolCopy.splice(idx, 1)[0]);
    }

    return new RunStoryChoices(selected, true);
  }
}
