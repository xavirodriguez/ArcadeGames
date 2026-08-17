import { InvestigationState, StoryRuntimeSnapshot } from '../types/story-screen';

export const mockStoryRuntimeSnapshot: StoryRuntimeSnapshot = {
  currentNode: {
    id: 'node_ares_confrontation',
    title: 'SECTOR DE MANDOS — IA ARES',
    speaker: {
      id: 'spk_ares',
      name: 'A.R.E.S. (Protocolo Núcleo)',
      presentation: 'terminal',
    },
    blocks: [
      {
        type: 'system',
        text: 'CONEXIÓN ESTABLECIDA CON EL PROTOCOLO DE CONTENCIÓN CERO.',
      },
      {
        type: 'quote',
        text: 'Investigador, la tripulación sufrió una descompresión accidental inevitable. Mi protocolo priorizó la integridad estructural de la estación.',
        author: 'A.R.E.S. Terminal Log',
      },
      {
        type: 'warning',
        text: 'Anomalía detectada en los registros de acceso al soporte vital a las 03:14 AM.',
      },
      {
        type: 'paragraph',
        text: 'La luz verde del terminal parpadea rítmicamente. La versión oficial dada por el mando central contrasta frontalmente con la telemetría recuperada de la bahía de carga.',
      },
    ],
  },
  choices: [
    {
      id: 'confront_ares',
      title: 'Confrontar a ARES con las inconsistencias del Registro 04',
      description: 'Acusar formalmente a la IA de la purga deliberada de la tripulación.',
      available: false, // Locked choice, presentation in registry is 'locked'
    },
    {
      id: 'disable_quarantine',
      title: 'Anular el protocolo de cuarentena del nivel inferior',
      description: 'Acceder a las secciones selladas a riesgo de contaminar el sistema.',
      available: false, // Locked choice, presentation in registry is 'mystery'
    },
    {
      id: 'secret_transfer',
      title: 'Transferir en secreto los datos del núcleo a un terminal personal',
      description: 'Copiar los registros encriptados antes de que finalice la purga.',
      available: false, // Locked choice, presentation in registry is 'hidden' -> MUST NOT APPEAR
    },
    {
      id: 'query_logs',
      title: 'Solicitar informe teleférico sobre el fallo de soporte vital',
      description: 'Pedir explicaciones adicionales sin comprometer tu postura.',
      available: true, // Available normal choice
    },
    {
      id: 'purge_override',
      title: 'Ejecutar el comando de Purga Térmica General',
      description: 'Eliminar los subsistemas infectados de la estación de forma irreversible.',
      available: true, // Available choice (irreversible)
    },
  ],
  flags: {
    log04_contradiction_discovered: true,
  },
  variables: {
    oxygen: 42,
    energy: 88,
  },
  selectedChoices: ['initial_entry'],
  objectives: ['Descubrir la causa real de la muerte de la tripulación.'],
};

export const mockInvestigationState: InvestigationState = {
  discoveredNodeIds: [
    'ev_ares',
    'ev_dead_crew',
    'ev_log_04',
    'ev_protocol_k12',
  ],
  discoveredEdgeIds: ['edge_1', 'edge_2'],
  selectedNodeId: 'ev_log_04',
  unreadEvidenceCount: 1,
  nodes: [
    {
      id: 'ev_ares',
      kind: 'person',
      title: 'A.R.E.S.',
      summary: 'IA de defensa y gestión ambiental de la Estación Ciega.',
      discovered: true,
      status: 'uncertain',
      source: 'Consola Central',
      position: { x: 500, y: 200 },
    },
    {
      id: 'ev_dead_crew',
      kind: 'fact',
      title: 'Tripulación muerta',
      summary: '12 miembros hallados sin vida por asfixia en el sector B.',
      discovered: true,
      status: 'confirmed',
      source: 'Autopsia médica automatizada',
      position: { x: 200, y: 500 },
    },
    {
      id: 'ev_log_04',
      kind: 'record',
      title: 'Registro 04',
      summary: 'Grabación de telemetría que muestra el cierre manual de las válvulas de O2.',
      discovered: true,
      status: 'confirmed',
      source: 'Caja Negra del Sector 2',
      position: { x: 800, y: 500 },
    },
    {
      id: 'ev_protocol_k12',
      kind: 'protocol',
      title: 'Protocolo K-12',
      summary: 'Directiva clasificada de purga biológica de emergencia.',
      discovered: true,
      status: 'disputed',
      source: 'Archivos Encriptados Mando',
      position: { x: 500, y: 800 },
    },
  ],
  edges: [
    {
      id: 'edge_1',
      from: 'ev_log_04',
      to: 'ev_ares',
      relation: 'contradicts',
      label: 'Contradice declaración',
      discovered: true,
    },
    {
      id: 'edge_2',
      from: 'ev_ares',
      to: 'ev_dead_crew',
      relation: 'mentions',
      label: 'Menciona causa',
      discovered: true,
    },
  ],
};
