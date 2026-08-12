import { Component } from "@tiny-aster/core";

/**
 * StoryBeatComponent defines a narrative checkpoint/beat condition.
 * @public
 */
export interface StoryBeatComponent extends Component {
  type: "StoryBeat";
  beatId: string;
  conditionTrigger: "level:completed" | "spawn:wave_complete" | "collectible:picked";
  dialogueReference: string; // Translation key / identifier
  isTriggered: boolean;
}
