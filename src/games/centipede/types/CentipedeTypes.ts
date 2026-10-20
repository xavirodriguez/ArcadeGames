import { CoreComponentRegistry, EventRegistry } from "@tiny-aster/core";

export interface CentipedeInput {
  up?: boolean;
  down?: boolean;
  left?: boolean;
  right?: boolean;
  fire?: boolean;
  p1Up?: boolean;
  p1Down?: boolean;
  p1Left?: boolean;
  p1Right?: boolean;
  p1Fire?: boolean;
}

export interface CentipedeStateComponent {
  type: "CentipedeState";
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dying" | "level_complete" | "game_over";
  mushroomsRemaining: number;
  respawnTimerMs: number;
}

export interface GridPosComponent {
  type: "GridPos";
  row: number;
  col: number;
}

export interface MushroomComponent {
  type: "Mushroom";
  hp: number;
  maxHp: number;
  isPoisoned: boolean;
  row: number;
  col: number;
  hashSeed: number;
}

export interface CentipedeSegmentComponent {
  type: "CentipedeSegment";
  chainId: string;
  segmentIndex: number; // 0 = head, 1..N-1 = body
  totalInChain: number;
  isHead: boolean;
  dirX: 1 | -1;
  dirY: 1 | -1;
  targetRow: number;
  targetCol: number;
  moveProgress: number; // 0 to 1 between cells
  isDiving: boolean;    // straight down dive when hitting poisoned mushroom
}

export interface ShooterComponent {
  type: "Shooter";
  fireCooldownMs: number;
}

export interface DartComponent {
  type: "Dart";
}

export interface SpiderComponent {
  type: "Spider";
  dirX: number;
  dirY: number;
  changeTimer: number;
}

export interface FleaComponent {
  type: "Flea";
  hp: number;
  maxHp: number;
  lastMushroomRow: number;
}

export interface ScorpionComponent {
  type: "Scorpion";
  dirX: 1 | -1;
}

// Pure presentation / visual components (NOT read by gameplay logic)
export interface SegmentVisualComponent {
  type: "SegmentVisual";
  visualX: number;
  visualY: number;
  vx: number;
  vy: number;
  popTimerMs: number;
  angle: number;
}

export interface MushroomVisualComponent {
  type: "MushroomVisual";
  growProgress: number; // 0 to 1
  flashTimerMs: number;
}

export interface SegmentDeathVisualComponent {
  type: "SegmentDeathVisual";
  timerMs: number;
  x: number;
  y: number;
  row: number;
  col: number;
}

export interface FloatingScoreVisualComponent {
  type: "FloatingScoreVisual";
  text: string;
  x: number;
  y: number;
  timerMs: number;
  maxTimerMs: number;
}

export interface AmbientParticleVisualComponent {
  type: "AmbientParticleVisual";
  particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number; alpha: number }>;
}

export interface CentipedeComponentRegistry extends CoreComponentRegistry {
  CentipedeState: CentipedeStateComponent;
  GridPos: GridPosComponent;
  Mushroom: MushroomComponent;
  CentipedeSegment: CentipedeSegmentComponent;
  Shooter: ShooterComponent;
  Dart: DartComponent;
  Spider: SpiderComponent;
  Flea: FleaComponent;
  Scorpion: ScorpionComponent;
  SegmentVisual: SegmentVisualComponent;
  MushroomVisual: MushroomVisualComponent;
  SegmentDeathVisual: SegmentDeathVisualComponent;
  FloatingScoreVisual: FloatingScoreVisualComponent;
  AmbientParticleVisual: AmbientParticleVisualComponent;
}

export interface CentipedeEventRegistry extends EventRegistry {
  "segment:destroyed": { row: number; col: number; chainId: string; score: number };
  "mushroom:hit": { row: number; col: number; remainingHp: number };
  "enemy:killed": { type: "spider" | "flea" | "scorpion"; score: number; x: number; y: number };
  "player:hit": Record<string, never>;
  "wave:cleared": { level: number };
  "game:over": { score: number };
}
