import { World, EventBus, StoryGraphValidator, StoryRuntime, CYOAScene, StoryChoice } from "@tiny-aster/core";
import { blindStationGraph } from "../BlindStation";

describe("BlindStation StoryGraph", () => {
  it("passes StoryGraphValidator validation with zero errors or warnings", () => {
    const result = StoryGraphValidator.validate(blindStationGraph);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("initializes at awakening node and transitions through first choices", () => {
    const world = new World();
    const eventBus = new EventBus();
    world.setResource("EventBus", eventBus);

    const runtime = new StoryRuntime(blindStationGraph);
    const scene = new CYOAScene(world, runtime);
    scene.onEnter(world);

    runtime.setVariable("evidencia", 0);
    runtime.setVariable("oxigeno", 100);
    runtime.setVariable("energia", 30);
    runtime.setVariable("confianzaIA", 0);

    expect(scene.getCurrentNode()?.id).toBe("awakening");

    // Select choice to ask ARES
    const choices = scene.getAvailableChoices();
    expect(choices.some((c: StoryChoice) => c.id === "preguntar_ares")).toBe(true);

    const success = scene.selectChoice("preguntar_ares");
    expect(success).toBe(true);
    expect(scene.getCurrentNode()?.id).toBe("dialogo_ares");

    // Proceed to Hub
    const hubSuccess = scene.selectChoice("proceed_hub_from_ares");
    expect(hubSuccess).toBe(true);
    expect(scene.getCurrentNode()?.id).toBe("hub_central");
  });

  it("unlocks reactor and powers infirmary to meet Dr. Vega", () => {
    const world = new World();
    const eventBus = new EventBus();
    world.setResource("EventBus", eventBus);

    const runtime = new StoryRuntime(blindStationGraph);
    const scene = new CYOAScene(world, runtime);
    scene.onEnter(world);

    runtime.setVariable("evidencia", 0);
    runtime.setVariable("oxigeno", 100);
    runtime.setVariable("energia", 30);
    runtime.setVariable("confianzaIA", 0);

    // Go to hub
    scene.selectChoice("preguntar_ares");
    scene.selectChoice("proceed_hub_from_ares");

    // Select reactor
    scene.selectChoice("ir_reactor");
    expect(scene.getCurrentNode()?.id).toBe("reactor_intro");

    // Activate power
    scene.selectChoice("activar_reactor_manual");
    expect(scene.getCurrentNode()?.id).toBe("reactor_restored");

    // Trigger reactor activated flags
    runtime.setFlag("reactorActivo", true);
    runtime.setFlag("vioGrabacionSecreta", true);
    runtime.setFlag("iaMintio", true);

    // Reroute power to infirmary
    scene.selectChoice("redirigir_enfermeria");
    expect(scene.getCurrentNode()?.id).toBe("power_infirmary");
    runtime.setFlag("energiaEnfermeria", true);

    // Return to hub
    scene.selectChoice("return_hub_inf_pwr");
    expect(scene.getCurrentNode()?.id).toBe("hub_central");

    // Go to infirmary
    scene.selectChoice("ir_enfermeria");
    expect(scene.getCurrentNode()?.id).toBe("enfermeria_intro");

    // Wake Dr. Vega (choice available due to energiaEnfermeria flag)
    const infChoices = scene.getAvailableChoices();
    expect(infChoices.some((c: StoryChoice) => c.id === "despertar_vega")).toBe(true);

    scene.selectChoice("despertar_vega");
    expect(scene.getCurrentNode()?.id).toBe("meet_vega");
  });

  it("evaluates final core choices based on accumulated evidence and flags", () => {
    const world = new World();
    const eventBus = new EventBus();
    world.setResource("EventBus", eventBus);

    const runtime = new StoryRuntime(blindStationGraph);
    const scene = new CYOAScene(world, runtime);
    scene.onEnter(world);

    runtime.setVariable("evidencia", 3);
    runtime.setVariable("oxigeno", 100);
    runtime.setVariable("energia", 70);
    runtime.setFlag("reactorActivo", true);
    runtime.setFlag("vioGrabacionSecreta", true);
    runtime.setFlag("encontroDoctora", true);
    runtime.setFlag("iaMintio", true);

    scene.selectChoice("preguntar_ares");
    scene.selectChoice("proceed_hub_from_ares");

    // Core is available because reactorActivo is true
    const hubChoices = scene.getAvailableChoices();
    expect(hubChoices.some((c: StoryChoice) => c.id === "ir_nucleo")).toBe(true);

    scene.selectChoice("ir_nucleo");
    expect(scene.getCurrentNode()?.id).toBe("ares_confrontacion");

    // Proceed to core decision terminal
    scene.selectChoice("proceder_al_nucleo");
    expect(scene.getCurrentNode()?.id).toBe("ai_core_decisions");

    // Check available end choices
    const coreChoices = scene.getAvailableChoices();
    const choiceIds = coreChoices.map((c: StoryChoice) => c.id);

    expect(choiceIds).toContain("apagar_ares");
    expect(choiceIds).toContain("mantener_cuarentena");
    expect(choiceIds).toContain("liberar_solo_vega");
    expect(choiceIds).toContain("protocolo_secreto");

    // Trigger secret ending
    const endSuccess = scene.selectChoice("protocolo_secreto");
    expect(endSuccess).toBe(true);
    expect(scene.getCurrentNode()?.id).toBe("endingSecret");
    expect(scene.getCurrentNode()?.isEndNode).toBe(true);
  });
});
