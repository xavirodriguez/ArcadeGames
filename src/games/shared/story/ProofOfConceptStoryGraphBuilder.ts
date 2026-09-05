import {
  StoryGraph,
  StoryGraphBuilder,
  StoryNodeBuilder,
  cond
} from "@tiny-aster/core";

export const builtProofOfConceptStoryGraph: StoryGraph = StoryGraphBuilder.graph(
  "poc_multi_game_campaign",
  "Proof of Concept: Multi-Game Campaign",
  "start_node"
)
  .addCharacter("ai", { id: "AI_ODYSSEY_7", name: "AI ODYSSEY 7" })
  .addCharacter("player", { id: "COMMANDER", name: "Comandante" })

  // 01: Inicio
  .addNode(
    StoryNodeBuilder.node("start_node")
      .asDialogue()
      .setTitle("Inicio: Crisis en la estación")
      .setDialogue({
        id: "dlg_start_crisis",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Alerta sectorial. Enjambre de asteroides detectado en aproximación." },
          { speakerName: "AI ODYSSEY 7", textKey: "Sistemas primarios en riesgo. Comandante, tome los controles." }
        ]
      })
      .addTransition("act1_asteroids_intro")
  )

  // 02: Intro Cutscene Act 1
  .addNode(
    StoryNodeBuilder.node("act1_asteroids_intro")
      .asCutscene()
      .setTitle("Despliegue Orbital")
      .setCutscene({
        id: "cs_act1_deploy",
        transitionEffect: "fade",
        dialogueQueue: [
          { speakerName: "SISTEMA", textKey: "Iniciando secuencia de lanzamiento de interceptor." },
          { speakerName: "AI ODYSSEY 7", textKey: "Destruya la primera oleada sin sufrir daños graves." }
        ]
      })
      .addTransition("act1_asteroids_gameplay")
  )

  // 03: Gameplay Act 1 (Asteroids)
  .addNode(
    StoryNodeBuilder.node("act1_asteroids_gameplay")
      .asGameplay()
      .setTitle("Acto 1: Despeje de Asteroides")
      .setSceneToLoad("asteroids")
      .setCheckpoint(true)
      .setMeta({
        minijuego: "asteroids",
        encounterId: "poc-asteroids-1"
      })
      .setObjective({
        id: "survive-asteroids-wave3",
        titleKey: "Sobrevive a las rocas",
        descriptionKey: "Destruye 3 oleadas de asteroides",
        targetCount: 3,
        currentCount: 0,
        completed: false
      })
      .addTransition("eval_act1_performance", {
        type: "objective",
        key: "survive-asteroids-wave3",
        operator: "==",
        value: true
      })
  )

  // 04: Branch Eval Act 1
  .addNode(
    StoryNodeBuilder.node("eval_act1_performance")
      .asBranch()
      .setTitle("Evaluación Acto 1")
      .addTransition(
        "branch_heroic_entry",
        {
          any: [
            { type: "flag", key: "asteroidsPerfect", value: true },
            { type: "flag", key: "heroicEntry", value: true }
          ]
        },
        10
      )
      .addTransition("branch_struggling_entry", undefined, 0)
  )

  // 05: Branch Heroic Entry
  .addNode(
    StoryNodeBuilder.node("branch_heroic_entry")
      .asDialogue()
      .setTitle("Entrada Heroica")
      .addEffect({ type: "setFlag", key: "heroicEntry", value: true })
      .setDialogue({
        id: "dlg_heroic_entry",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Maniobra limpia. Escudos al máximo rendimiento." }
        ]
      })
      .addTransition("narrative_bridge_choice")
  )

  // 06: Branch Struggling Entry
  .addNode(
    StoryNodeBuilder.node("branch_struggling_entry")
      .asDialogue()
      .setTitle("Entrada con Daños")
      .addEffect({ type: "setFlag", key: "heroicEntry", value: false })
      .setDialogue({
        id: "dlg_struggling_entry",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Impactos confirmados. Activando protocolo de asistencia táctica." }
        ]
      })
      .addTransition("narrative_bridge_choice")
  )

  // 07: Narrative Bridge with Explicit Choices
  .addNode(
    StoryNodeBuilder.node("narrative_bridge_choice")
      .asChoice()
      .setTitle("Elección de Ruta Táctica")
      .setDialogue({
        id: "dlg_tactical_choice",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Dos vectores tácticos disponibles tras superar el campo principal." },
          { speakerName: "AI ODYSSEY 7", textKey: "¿Interceptamos la armada invasora o atravesamos el canal de escombros?" }
        ]
      })
      .addChoice({
        id: "choice_space_invaders",
        titleKey: "Interceptar flota de invasores (Space Invaders)",
        descriptionKey: "Combate frontal directo contra la vanguardia enemiga.",
        targetNodeId: "act2_spaceinvaders_intro",
        effects: [{ type: "setFlag", key: "route_space_invaders", value: true }]
      })
      .addChoice({
        id: "choice_flappy_bird",
        titleKey: "Navegar canal de escombros (Flappy Bird)",
        descriptionKey: "Maniobra de sigilo ágil entre estructuras colapsadas.",
        targetNodeId: "act2_flappybird_intro",
        effects: [{ type: "setFlag", key: "route_flappy_bird", value: true }]
      })
  )

  // 08: Cutscene Space Invaders Route
  .addNode(
    StoryNodeBuilder.node("act2_spaceinvaders_intro")
      .asCutscene()
      .setTitle("Intercepción de Armada Hostil")
      .setCutscene({
        id: "cs_trans_spaceinvaders",
        transitionEffect: "IrisTransition",
        dialogueQueue: [
          { speakerName: "SISTEMA", textKey: "Contacto de radar confirmado. Formación hostil detectada." },
          { speakerName: "AI ODYSSEY 7", textKey: "Mantenga la línea defensiva. Destruya los invasores." }
        ]
      })
      .addTransition("act2_spaceinvaders_gameplay")
  )

  // 09: Gameplay Space Invaders Route
  .addNode(
    StoryNodeBuilder.node("act2_spaceinvaders_gameplay")
      .asGameplay()
      .setTitle("Acto 2: Space Invaders")
      .setSceneToLoad("space-invaders")
      .setCheckpoint(true)
      .setMeta({
        minijuego: "space-invaders",
        encounterId: "poc-space-invaders-1"
      })
      .setObjective({
        id: "repel-invaders-wave",
        titleKey: "Repele la invasión",
        descriptionKey: "Elimina 2 oleadas de invasores espaciales",
        targetCount: 2,
        currentCount: 0,
        completed: false
      })
      .addTransition("eval_act2_performance", {
        type: "objective",
        key: "repel-invaders-wave",
        operator: "==",
        value: true
      })
  )

  // 10: Cutscene Flappy Bird Route
  .addNode(
    StoryNodeBuilder.node("act2_flappybird_intro")
      .asCutscene()
      .setTitle("Navegación en Estrecho")
      .setCutscene({
        id: "cs_trans_flappybird",
        transitionEffect: "fade",
        dialogueQueue: [
          { speakerName: "SISTEMA", textKey: "Ingresando a canal de escombros de alta densidad." },
          { speakerName: "AI ODYSSEY 7", textKey: "Ajuste propulsores de altitud. Mantenga la nave estable." }
        ]
      })
      .addTransition("act2_flappybird_gameplay")
  )

  // 11: Gameplay Flappy Bird Route
  .addNode(
    StoryNodeBuilder.node("act2_flappybird_gameplay")
      .asGameplay()
      .setTitle("Acto 2: Canal de Escombros")
      .setSceneToLoad("flappybird")
      .setCheckpoint(true)
      .setMeta({
        minijuego: "flappybird",
        encounterId: "poc-flappybird-1"
      })
      .setObjective({
        id: "navigate-debris-channel",
        titleKey: "Navega el canal",
        descriptionKey: "Esquiva 10 estructuras en el canal de escombros",
        targetCount: 10,
        currentCount: 0,
        completed: false
      })
      .addTransition("eval_act2_performance", {
        type: "objective",
        key: "navigate-debris-channel",
        operator: "==",
        value: true
      })
  )

  // 12: Branch Eval Act 2
  .addNode(
    StoryNodeBuilder.node("eval_act2_performance")
      .asBranch()
      .setTitle("Evaluación Acto 2")
      .addTransition(
        "branch_reinforcements_success",
        {
          any: [
            { type: "flag", key: "reinforcementsReceived", value: true },
            { type: "variable", key: "spaceinvadersScore", operator: ">=", value: 2000 }
          ]
        },
        10
      )
      .addTransition("branch_reinforcements_failed", undefined, 0)
  )

  // 13: Branch Reinforcements Success
  .addNode(
    StoryNodeBuilder.node("branch_reinforcements_success")
      .asDialogue()
      .setTitle("Suministros Asegurados")
      .addEffect({ type: "setFlag", key: "reinforcementsReceived", value: true })
      .setDialogue({
        id: "dlg_reinforcements_success",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Rendimiento óptimo. Carga táctica y escudos suplementarios asegurados." }
        ]
      })
      .addTransition("act2_to_act3_bridge")
  )

  // 14: Branch Reinforcements Failed
  .addNode(
    StoryNodeBuilder.node("branch_reinforcements_failed")
      .asDialogue()
      .setTitle("Línea de Suministros Comprometida")
      .addEffect({ type: "setFlag", key: "reinforcementsReceived", value: false })
      .setDialogue({
        id: "dlg_reinforcements_failed",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Línea de suministros interrumpida. Entraremos al sector final con recursos mínimos." }
        ]
      })
      .addTransition("act2_to_act3_bridge")
  )

  // 15: Act 3 Router
  .addNode(
    StoryNodeBuilder.node("act2_to_act3_bridge")
      .asBranch()
      .setTitle("Router para Acto 3")
      .addTransition("act3_asteroids_redux_intro", cond.flag("route_space_invaders"), 10)
      .addTransition("act3_spaceinvaders_redux_intro", cond.flag("route_flappy_bird"), 5)
      .addTransition("act3_asteroids_redux_intro", undefined, 0)
  )

  // 16: Act 3 Asteroids Redux Intro
  .addNode(
    StoryNodeBuilder.node("act3_asteroids_redux_intro")
      .asCutscene()
      .setTitle("Retorno al Cinturón de Asteroides")
      .setCutscene({
        id: "cs_trans_asteroids_redux",
        transitionEffect: "fade",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Regresando al sector alfa. La densidad de asteroides ha alcanzado nivel crítico." },
          { speakerName: "AI ODYSSEY 7", textKey: "Ajuste de dificultad aplicado: Detección táctica avanzada requerida." }
        ]
      })
      .addTransition("act3_asteroids_redux_gameplay")
  )

  // 17: Act 3 Asteroids Redux Gameplay
  .addNode(
    StoryNodeBuilder.node("act3_asteroids_redux_gameplay")
      .asGameplay()
      .setTitle("Acto 3: Asteroids Clímax")
      .setSceneToLoad("asteroids")
      .setCheckpoint(true)
      .setMeta({
        minijuego: "asteroids",
        encounterId: "poc-asteroids-redux-1"
      })
      .setObjective({
        id: "clear-final-sector",
        titleKey: "Limpia el sector final",
        descriptionKey: "Supera el nivel 4 final de Asteroids",
        targetCount: 4,
        currentCount: 0,
        completed: false
      })
      .addTransition("final_evaluation_branch", {
        type: "objective",
        key: "clear-final-sector",
        operator: "==",
        value: true
      })
  )

  // 18: Act 3 Space Invaders Redux Intro
  .addNode(
    StoryNodeBuilder.node("act3_spaceinvaders_redux_intro")
      .asCutscene()
      .setTitle("Ataque Final Invasor")
      .setCutscene({
        id: "cs_trans_si_redux",
        transitionEffect: "IrisTransition",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Nodriza enemiga detectada. La armada invasora ha lanzado un contraataque total." },
          { speakerName: "AI ODYSSEY 7", textKey: "Dificultad pesadilla activada. Resista hasta el último impacto." }
        ]
      })
      .addTransition("act3_spaceinvaders_redux_gameplay")
  )

  // 19: Act 3 Space Invaders Redux Gameplay
  .addNode(
    StoryNodeBuilder.node("act3_spaceinvaders_redux_gameplay")
      .asGameplay()
      .setTitle("Acto 3: Space Invaders Clímax")
      .setSceneToLoad("space-invaders")
      .setCheckpoint(true)
      .setMeta({
        minijuego: "space-invaders",
        encounterId: "poc-spaceinvaders-redux-1"
      })
      .setObjective({
        id: "repel-final-fleet",
        titleKey: "Repele la flota final",
        descriptionKey: "Elimina 3 oleadas finales de invasores pesados",
        targetCount: 3,
        currentCount: 0,
        completed: false
      })
      .addTransition("final_evaluation_branch", {
        type: "objective",
        key: "repel-final-fleet",
        operator: "==",
        value: true
      })
  )

  // 20: Final Evaluation Branch
  .addNode(
    StoryNodeBuilder.node("final_evaluation_branch")
      .asBranch()
      .setTitle("Determinación de Final")
      .addTransition(
        "ending_flawless",
        {
          all: [
            cond.flag("heroicEntry"),
            cond.flag("reinforcementsReceived")
          ]
        },
        30
      )
      .addTransition(
        "ending_pyrrhic",
        {
          any: [
            cond.flag("heroicEntry"),
            cond.flag("reinforcementsReceived")
          ]
        },
        20
      )
      .addTransition("ending_survival", undefined, 0)
  )

  // 21: Flawless Victory Ending
  .addNode(
    StoryNodeBuilder.node("ending_flawless")
      .asCutscene()
      .setTitle("Final: Victoria Impecable")
      .setIsEndNode(true)
      .setCutscene({
        id: "cs_ending_flawless",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Victoria Impecable. Todos los sectores limpios y suministros resguardados." },
          { speakerName: "COMMANDER", textKey: "La estación está a salvo. Misión cumplida." }
        ]
      })
  )

  // 22: Pyrrhic Victory Ending
  .addNode(
    StoryNodeBuilder.node("ending_pyrrhic")
      .asCutscene()
      .setTitle("Final: Victoria Pirrórica")
      .setIsEndNode(true)
      .setCutscene({
        id: "cs_ending_pyrrhic",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Sobrevivimos al ataque, pero los sistemas sufrieron daños significativos." },
          { speakerName: "COMMANDER", textKey: "Una victoria amarga, pero seguimos de pie." }
        ]
      })
  )

  // 23: Survival Ending
  .addNode(
    StoryNodeBuilder.node("ending_survival")
      .asCutscene()
      .setTitle("Final: Supervivencia")
      .setIsEndNode(true)
      .setCutscene({
        id: "cs_ending_survival",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Apenas lo logramos. Los recursos están prácticamente agotados." },
          { speakerName: "COMMANDER", textKey: "Resistimos hoy. Mañana será otra batalla." }
        ]
      })
  )
  .build();
