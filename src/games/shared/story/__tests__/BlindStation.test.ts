import { World, CYOAScene } from "@tiny-aster/core";
import {
  BlindStationGraph,
  BlindStationValidation,
  createBlindStationStory,
  getBlindStationDebugState,
} from "../BlindStation";

describe("BlindStation StoryGraph", () => {
  it("passes validation with zero errors or warnings", () => {
    expect(BlindStationValidation.valid).toBe(true);
    expect(BlindStationValidation.errors).toEqual([]);
    expect(BlindStationValidation.warnings).toEqual([]);
  });

  it("initializes story and transitions from opening cutscene to awakening choice", () => {
    const world = new World();
    const { runtime } = createBlindStationStory(world);
    const scene = new CYOAScene(world, runtime);
    scene.onEnter(world);

    // Initial node transitions from opening cutscene beat to awakening choice
    expect(scene.getCurrentNode()?.id).toBe("awakening_choice");

    const choices = scene.getAvailableChoices();
    expect(choices.length).toBe(3);

    const debugState = getBlindStationDebugState(runtime);
    expect(debugState.variables.evidence).toBe(0);
    expect(debugState.variables.oxygen).toBe(100);
    expect(debugState.variables.assertiveness).toBe(0);
    expect(debugState.variables.empathyStyle).toBe(0);
  });

  it("mutates assertiveness and empathyStyle variables when relevant choices are selected", () => {
    const world = new World();
    const { runtime } = createBlindStationStory(world);
    const scene = new CYOAScene(world, runtime);
    scene.onEnter(world);

    // Initial values
    expect(runtime.getState().variables.assertiveness).toBe(0);
    expect(runtime.getState().variables.empathyStyle).toBe(0);

    // Select "inspect_terminal_first" choice -> assertiveness += 1
    scene.selectChoice("inspect_terminal_first");
    expect(runtime.getState().variables.assertiveness).toBe(1);

    // Navigate to power_choice and select "power_comms" -> assertiveness += 1
    runtime.navigateToNode("power_choice");
    scene.selectChoice("power_comms");
    expect(runtime.getState().variables.assertiveness).toBe(2);

    // Navigate to vega_choice and select "trust_vega" -> empathyStyle += 1
    runtime.navigateToNode("vega_choice");
    scene.selectChoice("trust_vega");
    expect(runtime.getState().variables.empathyStyle).toBe(1);
  });

  it("tracks investigation progress and unlocks power distribution choice when all 3 sectors visited", () => {
    const world = new World();
    const { runtime, eventBus } = createBlindStationStory(world);
    const scene = new CYOAScene(world, runtime);
    scene.onEnter(world);

    expect(scene.getCurrentNode()?.id).toBe("awakening_choice");

    // Ask ARES first -> ask_ares -> auto-evaluates transition to hub
    scene.selectChoice("ask_ares_first");
    expect(scene.getCurrentNode()?.id).toBe("hub");

    // Visit reactor (reactor_intro -> reactor_objective)
    scene.selectChoice("visit_reactor");
    expect(scene.getCurrentNode()?.id).toBe("reactor_objective");

    // Complete reactor objective (reactor_objective -> reactor_evidence -> investigation_branch -> hub)
    eventBus.emit("reactor:restored", {});
    expect(scene.getCurrentNode()?.id).toBe("hub");

    // Visit infirmary (infirmary_intro -> infirmary_log -> investigation_branch -> hub)
    scene.selectChoice("visit_infirmary");
    expect(scene.getCurrentNode()?.id).toBe("hub");

    // Visit comms (comms_intro -> comms_blackbox -> investigation_branch -> hub)
    scene.selectChoice("visit_comms");
    expect(scene.getCurrentNode()?.id).toBe("hub");

    // Once investigationComplete is true, the hub choice "route_emergency_power" is unlocked
    const choices = scene.getAvailableChoices();
    expect(choices.map((c) => c.id)).toContain("route_emergency_power");

    scene.selectChoice("route_emergency_power");
    expect(scene.getCurrentNode()?.id).toBe("power_choice");
  });

  it("handles reactor and lab objective progress events properly", () => {
    const world = new World();
    const { runtime, eventBus } = createBlindStationStory(world);

    runtime.navigateToNode("reactor_objective");
    expect(runtime.getState().objectives["reactivate_reactor"]?.currentCount).toBe(0);

    eventBus.emit("reactor:module_online", { moduleId: "A" });
    expect(runtime.getState().objectives["reactivate_reactor"]?.currentCount).toBe(1);

    eventBus.emit("reactor:restored", {});
    expect(runtime.getState().objectives["reactivate_reactor"]?.completed).toBe(true);
    // Auto-evaluates through reactor_evidence -> investigation_branch -> hub
    expect(runtime.getCurrentNode()?.id).toBe("hub");

    runtime.navigateToNode("lab_objective");
    expect(runtime.getState().objectives["scan_samples"]?.currentCount).toBe(0);

    eventBus.emit("lab:sample_scanned", { sampleId: "1" });
    eventBus.emit("lab:sample_scanned", { sampleId: "2" });
    eventBus.emit("lab:sample_scanned", { sampleId: "3" });

    expect(runtime.getState().objectives["scan_samples"]?.completed).toBe(true);
    // Auto-evaluates through lab_revelation -> core_approach -> core_choice
    expect(runtime.getCurrentNode()?.id).toBe("core_choice");
  });

  it("unlocks final choices based on gathered evidence and story flags", () => {
    const world = new World();
    const { runtime } = createBlindStationStory(world);
    const scene = new CYOAScene(world, runtime);
    scene.onEnter(world);

    runtime.setVariable("evidence", 4);
    runtime.setFlag("reactorActive", true);
    runtime.setFlag("sawSecretRecording", true);
    runtime.setFlag("foundVega", true);

    runtime.navigateToNode("core_choice");
    const choices = scene.getAvailableChoices();
    const ids = choices.map((c) => c.id);

    expect(ids).toContain("ending_shutdown_choice");
    expect(ids).toContain("ending_quarantine_choice");
    expect(ids).toContain("ending_release_choice");
    expect(ids).toContain("ending_secret_choice");

    scene.selectChoice("ending_secret_choice");
    expect(scene.getCurrentNode()?.id).toBe("ending_secret");
    expect(scene.getCurrentNode()?.isEndNode).toBe(true);
  });
});
