import {
  StoryRuntime,
  ArcadeOrchestrator,
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  StoryGraph,
  MetaProgressionService
} from "@tiny-aster/core";
import { proofOfConceptStoryGraph } from "./ProofOfConceptStoryGraph";
import {
  asteroidsPOCEncounter,
  spaceInvadersPOCEncounter,
  flappyBirdPOCEncounter,
  asteroidsReduxPOCEncounter,
  spaceInvadersReduxPOCEncounter
} from "./StoryEncounters";

/**
 * Controller class managing the Multi-Game Story Proof-of-Concept campaign session.
 * Orchestrates narrative node changes, game context generation, and transition handling
 * across Asteroids (Act 1) -> Choice Bridge (Space Invaders OR Flappy Bird) -> Redux Climax (Act 3).
 */
export class MultiGameStoryProofOfConcept {
  public readonly storyRuntime: StoryRuntime;
  public readonly orchestrator: ArcadeOrchestrator;
  public readonly metaService: MetaProgressionService;
  private registeredEncounters: Map<string, MiniGameEncounter> = new Map();

  constructor(graphOverride?: StoryGraph, metaServiceOverride?: MetaProgressionService) {
    const graph = graphOverride || proofOfConceptStoryGraph;
    this.storyRuntime = new StoryRuntime(graph);
    this.orchestrator = new ArcadeOrchestrator({ runtime: this.storyRuntime });
    this.metaService = metaServiceOverride || new MetaProgressionService(undefined, undefined, false);

    // Register all campaign encounters
    this.registerEncounter(asteroidsPOCEncounter);
    this.registerEncounter(spaceInvadersPOCEncounter);
    this.registerEncounter(flappyBirdPOCEncounter);
    this.registerEncounter(asteroidsReduxPOCEncounter);
    this.registerEncounter(spaceInvadersReduxPOCEncounter);
  }

  /**
   * Registers a MiniGameEncounter definition into the campaign controller lookup.
   */
  public registerEncounter(encounter: MiniGameEncounter): void {
    this.registeredEncounters.set(encounter.id, encounter);
  }

  /**
   * Retrieves registered encounter by ID.
   */
  public getEncounter(encounterId: string): MiniGameEncounter | undefined {
    return this.registeredEncounters.get(encounterId);
  }

  /**
   * Starts or restarts the proof-of-concept campaign graph.
   */
  public startCampaign(): void {
    if (proofOfConceptStoryGraph.entryNodeId) {
      this.storyRuntime.navigateToNode(proofOfConceptStoryGraph.entryNodeId);
    }
  }

  /**
   * Starts a minigame run for the current narrative node if it specifies an encounterId in meta.
   */
  public startCurrentNodeGameplay(): MiniGameRunContext | null {
    const currentNode = this.storyRuntime.getCurrentNode();
    if (!currentNode || currentNode.type !== "gameplay") {
      return null;
    }

    const encounterId = currentNode.meta?.encounterId as string;
    if (!encounterId) {
      return null;
    }

    const encounter = this.registeredEncounters.get(encounterId);
    if (!encounter) {
      return null;
    }

    const snapshot = this.storyRuntime.getState();
    const runContext = this.orchestrator.startRun(encounter, snapshot, currentNode.id);
    this.orchestrator.notifyPlaying();
    return runContext;
  }

  /**
   * Submits gameplay outcome results, applies narrative effects, updates metaprogression,
   * and advances narrative state.
   */
  public submitGameplayResult(result: MiniGameResult): void {
    // 1. Apply effects calculated by OutcomeRuleEngine via ArcadeOrchestrator
    const effects = this.orchestrator.submitResult(result);

    // 2. Update variables in StoryRuntime if applicable
    if (result.gameId === "space-invaders") {
      this.storyRuntime.setVariable("spaceinvadersScore", result.score);
    } else if (result.gameId === "asteroids") {
      const currentLvl = (this.storyRuntime.getVariable("asteroidLevelReached") as number) || 1;
      this.storyRuntime.setVariable("asteroidLevelReached", currentLvl + 1);
    }

    // 3. Complete objective for current gameplay node upon minigame conclusion
    const currentNode = this.storyRuntime.getCurrentNode();
    if (currentNode?.objective) {
      this.storyRuntime.applyEffect({
        type: "completeObjective",
        objectiveId: currentNode.objective.id
      });
    }

    // 4. Update metaprogression minigame mastery upon completion
    if (result.completed) {
      this.metaService.incrementMiniGameMastery(result.gameId, 1);
    }

    // 5. Advance narrative transitions out of current node
    this.storyRuntime.evaluateTransitions();

    // 6. Check if new active node is a campaign terminal ending
    const newCurrentNode = this.storyRuntime.getCurrentNode();
    if (newCurrentNode?.isEndNode) {
      this.metaService.recordRunCompletion(newCurrentNode.id);

      // Unlock permanent campaign rewards from MutatorRegistry (BENEFICIAL_MUTATORS) for victories
      if (newCurrentNode.id === "ending_flawless" || newCurrentNode.id === "ending_pyrrhic") {
        this.metaService.unlockModifier("hyper_drift");
        this.metaService.unlockModifier("shield_pulse");
      }
    }
  }
}
