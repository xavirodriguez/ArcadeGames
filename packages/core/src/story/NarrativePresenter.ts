import {
  NarrativePresentationContext,
  NarrativePresentationModel,
  StoryChoice
} from "./StoryTypes";

/**
 * Interface contract for decoupled narrative presentation adapters.
 *
 * @remarks
 * Decouples story runtime state and graph execution from UI layout. Presenters translate pure narrative node
 * payloads into uniform presentation view models adapted for CYOA, Visual Novel, Terminal CLI, or Game Overlays.
 *
 * @public
 */
export interface NarrativePresenter {
  /**
   * Constructs a uniform presentation model snapshot from narrative execution context.
   *
   * @param context - Narrative node and state context.
   * @returns Unified presentation view model.
   */
  buildViewModel(context: NarrativePresentationContext): NarrativePresentationModel;
}

/**
 * Presentation adapter constructing Choose Your Own Adventure (CYOA) text layout models.
 *
 * @public
 */
export class CYOAPresenter implements NarrativePresenter {
  public buildViewModel(context: NarrativePresentationContext): NarrativePresentationModel {
    const { node, availableChoices = [] } = context;

    let bodyText = "";
    if (node.dialogue) {
      bodyText = node.dialogue.lines.map((l) => `${l.speakerName ? l.speakerName + ": " : ""}${l.textKey}`).join("\n\n");
    } else if (node.cutscene) {
      bodyText = (node.cutscene.dialogueQueue || []).map((l) => `${l.speakerName ? l.speakerName + ": " : ""}${l.textKey}`).join("\n\n");
    } else {
      bodyText = node.title || `[${node.type.toUpperCase()}]`;
    }

    const choices = availableChoices.map((c) => ({
      id: c.id,
      label: c.titleKey,
      description: c.descriptionKey,
      enabled: true
    }));

    return {
      style: "cyoa",
      title: node.title || "Aventura Narrativa",
      body: bodyText,
      choices
    };
  }
}

/**
 * Presentation adapter constructing Retro CLI Terminal layout models.
 *
 * @public
 */
export class TerminalPresenter implements NarrativePresenter {
  public buildViewModel(context: NarrativePresentationContext): NarrativePresentationModel {
    const { node, availableChoices = [] } = context;

    let terminalLines: string[] = [];
    terminalLines.push(`> SYSTEM NODE: ${node.id.toUpperCase()}`);
    terminalLines.push(`> TYPE: ${node.type.toUpperCase()}`);
    terminalLines.push("----------------------------------------");

    if (node.dialogue) {
      for (const line of node.dialogue.lines) {
        const speaker = line.speakerName ? line.speakerName.toUpperCase() : "LOG";
        terminalLines.push(`> ${speaker}:// ${line.textKey}`);
      }
    } else if (node.cutscene) {
      for (const line of node.cutscene.dialogueQueue || []) {
        const speaker = line.speakerName ? line.speakerName.toUpperCase() : "SYSTEM";
        terminalLines.push(`> ${speaker}:// ${line.textKey}`);
      }
    }

    const choices = availableChoices.map((c, idx) => ({
      id: c.id,
      label: `[${idx + 1}] ${c.titleKey}`,
      description: c.descriptionKey,
      enabled: true
    }));

    return {
      style: "terminal",
      title: `TERMINAL v1.0 // ${node.title || node.id}`,
      body: terminalLines.join("\n"),
      choices,
      themeMeta: {
        fontFamily: "monospace",
        colorCyan: "#00f0ff",
        colorGreen: "#00ff66"
      }
    };
  }
}

/**
 * Presentation adapter constructing Visual Novel overlay models with character card and portrait metadata.
 *
 * @public
 */
export class VisualNovelPresenter implements NarrativePresenter {
  public buildViewModel(context: NarrativePresentationContext): NarrativePresentationModel {
    const { node, characters = {}, availableChoices = [] } = context;

    let speakerName = "";
    let avatarUrl: string | undefined = undefined;
    let emotion: string | undefined = undefined;
    let bodyText = "";

    const activeLine = node.dialogue?.lines[0] || node.cutscene?.dialogueQueue?.[0];
    if (activeLine) {
      speakerName = activeLine.speakerName || "Narrador";
      emotion = activeLine.emotion || "neutral";
      if (activeLine.characterId && characters[activeLine.characterId]) {
        avatarUrl = characters[activeLine.characterId].avatarUrl;
        speakerName = characters[activeLine.characterId].name;
      }
      bodyText = activeLine.textKey;
    } else {
      speakerName = node.title || "Escena";
      bodyText = "...";
    }

    const choices = availableChoices.map((c) => ({
      id: c.id,
      label: c.titleKey,
      description: c.descriptionKey,
      enabled: true
    }));

    return {
      style: "visual_novel",
      title: node.title || "Diálogo",
      body: bodyText,
      speaker: {
        name: speakerName,
        avatarUrl,
        emotion
      },
      choices,
      themeMeta: {
        overlay: true,
        transitionEffect: node.cutscene?.transitionEffect || "fade"
      }
    };
  }
}
