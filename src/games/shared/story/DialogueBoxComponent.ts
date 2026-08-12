import { Component } from "@tiny-aster/core";

/**
 * DialogueBoxComponent stores active dialogue queues and typewriter animation properties.
 * @public
 */
export interface DialogueBoxComponent extends Component {
  type: "DialogueBox";
  /** Queue of line keys or text lines */
  lines: string[];
  /** Current active line index */
  currentLineIndex: number;
  /** Speed of the typing animation in characters per second */
  typingSpeed: number;
  /** Amount of time elapsed in the current line for the typing animation */
  elapsedTime: number;
  /** Whether the typing animation for the current line has finished */
  isLineFinished: boolean;
  /** Input button/trigger key to advance to next line */
  advanceKey?: string;
}
