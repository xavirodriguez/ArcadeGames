import type { World } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import type { RacingComponentRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";
import { RACING_PALETTES, type RacingPalette } from "./RacingPalette";
import { Skia } from "../../shared/rendering/SkiaContext";

export type RenderPrimitive =
  | { type: "rect"; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; strokeWidth?: number; alpha?: number }
  | { type: "roundRect"; x: number; y: number; w: number; h: number; r: number; fill?: string; stroke?: string; strokeWidth?: number; alpha?: number }
  | { type: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number; alpha?: number }
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number; rotation?: number; fill?: string; stroke?: string; strokeWidth?: number; alpha?: number }
  | { type: "arc"; cx: number; cy: number; r: number; startAngle: number; endAngle: number; fill?: string; stroke?: string; strokeWidth?: number; alpha?: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth?: number; alpha?: number; lineCap?: "butt" | "round" | "square" }
  | { type: "path"; points: Array<{ x: number; y: number }>; closed?: boolean; fill?: string; stroke?: string; strokeWidth?: number; alpha?: number }
  | { type: "text"; x: number; y: number; text: string; fontSize: number; fill: string; align?: "center" | "left" | "right"; baseline?: "middle" | "top" | "bottom"; alpha?: number }
  | { type: "group"; x?: number; y?: number; rotation?: number; scaleX?: number; scaleY?: number; alpha?: number; children: RenderPrimitive[] };

export interface ActorDrawerParams {
  size: number;
  isPlayer: boolean;
  boosting: boolean;
  time: number;
  palette: RacingPalette;
  color?: string;
  rotation?: number;
}

export interface ObstacleDrawerParams {
  radius: number;
  id: string;
  time: number;
  palette: RacingPalette;
}

export interface ZoneDrawerParams {
  width: number;
  height: number;
  palette: RacingPalette;
}

export interface WallDrawerParams {
  width: number;
  height: number;
  palette: RacingPalette;
}

export interface SurfaceDrawerParams {
  width: number;
  height: number;
  palette: RacingPalette;
  pattern?: "wood" | "diagonal" | "starfield" | "none";
}

export type DrawerSpec<TParams> = (params: TParams) => RenderPrimitive[];

export interface RacingSkin {
  id: string;
  palette: RacingPalette;
  surfacePattern?: "wood" | "diagonal" | "starfield" | "none";
  obstacleDrawers: Record<string, DrawerSpec<ObstacleDrawerParams>>;
  zoneDrawers: Record<string, DrawerSpec<ZoneDrawerParams>>;
  wallDrawer?: DrawerSpec<WallDrawerParams>;
  actorDrawer: DrawerSpec<ActorDrawerParams>;
  finishCheckers?: [string, string];
  ui?: { glowColor: string; accentColor: string };
  extraColors?: Record<string, string>;
}

export function extractActorParams(
  world: World<RacingComponentRegistry, any>,
  entity: number,
  palette: RacingPalette
): ActorDrawerParams | null {
  const render = world.getComponent(entity, "Render");
  if (!render) return null;
  const transform = world.getComponent(entity, "Transform");
  const input = world.getComponent(entity, "Input");
  return {
    size: render.size ?? 16,
    isPlayer: world.hasComponent(entity, "LocalPlayer"),
    boosting: input?.actions.boost === true,
    time: world.getResource<number>("RacingTime") ?? 0,
    palette,
    color: render.color,
    rotation: transform?.rotation ?? 0
  };
}

export function extractWallParams(
  world: World<RacingComponentRegistry, any>,
  entity: number,
  palette: RacingPalette
): WallDrawerParams | null {
  const render = world.getComponent(entity, "Render");
  const wall = world.getComponent(entity, "RacingWall");
  if (!render || !wall) return null;
  return { width: wall.width, height: wall.height, palette };
}

export function extractZoneParams(
  world: World<RacingComponentRegistry, any>,
  entity: number,
  palette: RacingPalette
): { width: number; height: number; surface: string; palette: RacingPalette } | null {
  const data = world.getComponent(entity, "TrackZoneData");
  const render = world.getComponent(entity, "Render");
  if (!data && !render) return null;
  return {
    width: data?.width ?? 140,
    height: data?.height ?? 140,
    surface: data?.surface ?? "water",
    palette
  };
}

export function extractObstacleParams(
  world: World<RacingComponentRegistry, any>,
  entity: number,
  palette: RacingPalette
): { radius: number; id: string; kind: string; time: number; palette: RacingPalette } | null {
  const data = world.getComponent(entity, "TrackObstacleData");
  const render = world.getComponent(entity, "Render");
  if (!data && !render) return null;
  return {
    radius: data?.radius ?? render?.size ?? 30,
    id: data?.id ?? "",
    kind: data?.kind ?? "bowl",
    time: world.getResource<number>("RacingTime") ?? 0,
    palette
  };
}

// Default Toy Car Actor Drawer
export const defaultCarActorDrawer: DrawerSpec<ActorDrawerParams> = (params) => {
  const { size, isPlayer, boosting, time, palette } = params;
  const bodyColor = params.color ?? (isPlayer ? palette.player : palette.rival);
  const highlightColor = isPlayer ? palette.playerHighlight : palette.rivalHighlight;
  const primitives: RenderPrimitive[] = [];

  if (boosting) {
    const oscillation = Math.sin(time * 30) * 0.15 + Math.cos(time * 47) * 0.1;
    const flameLen = size * (1.5 + oscillation);

    primitives.push(
      {
        type: "path",
        points: [
          { x: -size * 0.9, y: 0 },
          { x: -size * 0.9 - flameLen, y: -size * 0.4 },
          { x: -size * 0.9 - flameLen, y: size * 0.4 }
        ],
        closed: true,
        fill: palette.danger
      },
      {
        type: "path",
        points: [
          { x: -size * 0.9, y: 0 },
          { x: -size * 0.9 - flameLen * 0.7, y: -size * 0.25 },
          { x: -size * 0.9 - flameLen * 0.7, y: size * 0.25 }
        ],
        closed: true,
        fill: palette.obstacle
      },
      {
        type: "path",
        points: [
          { x: -size * 0.9, y: 0 },
          { x: -size * 0.9 - flameLen * 0.4, y: -size * 0.12 },
          { x: -size * 0.9 - flameLen * 0.4, y: size * 0.12 }
        ],
        closed: true,
        fill: palette.accent
      },
      {
        type: "line",
        x1: -size * 1.5,
        y1: -size * 0.7,
        x2: -size * 2.8,
        y2: -size * 0.7,
        stroke: palette.text,
        strokeWidth: 1.5,
        alpha: 0.5
      },
      {
        type: "line",
        x1: -size * 1.5,
        y1: size * 0.7,
        x2: -size * 2.8,
        y2: size * 0.7,
        stroke: palette.text,
        strokeWidth: 1.5,
        alpha: 0.5
      }
    );
  }

  // Shadow
  primitives.push({
    type: "ellipse",
    cx: 4,
    cy: 5,
    rx: size * 1.05,
    ry: size * 0.6,
    fill: palette.shadow,
    alpha: 0.35
  });

  // Wheels
  const wW = size * 0.45;
  const wH = size * 0.22;
  primitives.push(
    { type: "rect", x: -size * 0.7, y: -size * 0.6, w: wW, h: wH, fill: palette.outline },
    { type: "rect", x: size * 0.25, y: -size * 0.6, w: wW, h: wH, fill: palette.outline },
    { type: "rect", x: -size * 0.7, y: size * 0.38, w: wW, h: wH, fill: palette.outline },
    { type: "rect", x: size * 0.25, y: size * 0.38, w: wW, h: wH, fill: palette.outline }
  );

  // Body
  primitives.push({
    type: "roundRect",
    x: -size * 0.9,
    y: -size * 0.5,
    w: size * 1.8,
    h: size * 1.0,
    r: size * 0.3,
    fill: bodyColor,
    stroke: palette.outline,
    strokeWidth: 1.5
  });

  // Roof Highlight
  primitives.push({
    type: "roundRect",
    x: -size * 0.4,
    y: -size * 0.35,
    w: size * 0.8,
    h: size * 0.7,
    r: size * 0.2,
    fill: highlightColor
  });

  // Glass
  primitives.push(
    { type: "rect", x: -size * 0.15, y: -size * 0.3, w: size * 0.35, h: size * 0.6, fill: palette.outline },
    { type: "rect", x: -size * 0.05, y: -size * 0.2, w: size * 0.12, h: size * 0.15, fill: palette.text, alpha: 0.6 }
  );

  // Decals
  if (isPlayer) {
    primitives.push(
      { type: "rect", x: -size * 0.85, y: -size * 0.08, w: size * 0.7, h: size * 0.16, fill: palette.accent },
      { type: "rect", x: -size * 0.92, y: -size * 0.45, w: size * 0.1, h: size * 0.9, fill: palette.outline },
      { type: "rect", x: -size * 0.98, y: -size * 0.48, w: size * 0.15, h: size * 0.96, fill: palette.player }
    );
  } else {
    primitives.push(
      { type: "rect", x: -size * 0.7, y: -size * 0.42, w: size * 1.2, h: size * 0.08, fill: palette.accent },
      { type: "rect", x: -size * 0.7, y: size * 0.34, w: size * 1.2, h: size * 0.08, fill: palette.accent },
      {
        type: "text",
        x: size * 0.25,
        y: 0,
        text: "01",
        fontSize: Math.round(size * 0.45),
        fill: palette.text,
        align: "center",
        baseline: "middle"
      }
    );
  }

  // Headlights & Taillights
  primitives.push(
    { type: "circle", cx: size * 0.85, cy: -size * 0.3, r: size * 0.12, fill: palette.accent },
    { type: "circle", cx: size * 0.85, cy: size * 0.3, r: size * 0.12, fill: palette.accent },
    { type: "rect", x: -size * 0.9, y: -size * 0.35, w: size * 0.08, h: size * 0.15, fill: palette.danger },
    { type: "rect", x: -size * 0.9, y: size * 0.2, w: size * 0.08, h: size * 0.15, fill: palette.danger }
  );

  return primitives;
};

// Spaceship Actor Drawer (for Space theme)
export const spaceshipActorDrawer: DrawerSpec<ActorDrawerParams> = (params) => {
  const { size, isPlayer, boosting, time, palette } = params;
  const mainColor = params.color ?? (isPlayer ? "#ff007f" : "#ffe600");
  const glowColor = isPlayer ? "#00f0ff" : "#00ffcc";
  const primitives: RenderPrimitive[] = [];

  if (boosting) {
    const flameLen = size * (1.6 + Math.sin(time * 40) * 0.3);
    primitives.push(
      {
        type: "path",
        points: [
          { x: -size * 0.8, y: 0 },
          { x: -size * 0.8 - flameLen, y: -size * 0.3 },
          { x: -size * 0.8 - flameLen, y: size * 0.3 }
        ],
        closed: true,
        fill: "#ff2a6d"
      },
      {
        type: "path",
        points: [
          { x: -size * 0.8, y: 0 },
          { x: -size * 0.8 - flameLen * 0.6, y: -size * 0.15 },
          { x: -size * 0.8 - flameLen * 0.6, y: size * 0.15 }
        ],
        closed: true,
        fill: "#00f0ff"
      }
    );
  }

  // Ship Shadow
  primitives.push({
    type: "ellipse",
    cx: 2,
    cy: 4,
    rx: size * 1.1,
    ry: size * 0.5,
    fill: palette.shadow,
    alpha: 0.4
  });

  // Sleek Delta Wings
  primitives.push(
    {
      type: "path",
      points: [
        { x: size * 1.2, y: 0 },
        { x: -size * 0.9, y: -size * 0.8 },
        { x: -size * 0.5, y: 0 },
        { x: -size * 0.9, y: size * 0.8 }
      ],
      closed: true,
      fill: mainColor,
      stroke: palette.outline,
      strokeWidth: 1.5
    },
    // Cockpit Canopy
    {
      type: "ellipse",
      cx: size * 0.2,
      cy: 0,
      rx: size * 0.45,
      ry: size * 0.22,
      fill: glowColor
    },
    // Engine Thruster Nodes
    { type: "circle", cx: -size * 0.7, cy: -size * 0.3, r: size * 0.15, fill: glowColor },
    { type: "circle", cx: -size * 0.7, cy: size * 0.3, r: size * 0.15, fill: glowColor }
  );

  return primitives;
};

// Obstacle Drawers
export const bowlObstacleDrawer: DrawerSpec<ObstacleDrawerParams> = ({ radius, palette }) => {
  const primitives: RenderPrimitive[] = [
    { type: "circle", cx: 4, cy: 5, r: radius, fill: palette.shadow, alpha: 0.32 },
    { type: "circle", cx: 0, cy: 0, r: radius, fill: "#F8FAFC", stroke: palette.outline, strokeWidth: 2 },
    { type: "circle", cx: 0, cy: 0, r: radius * 0.8, fill: "#FFFEE0" }
  ];
  const numRings = 5;
  for (let i = 0; i < numRings; i += 1) {
    const angle = (i * Math.PI * 2) / numRings;
    const dist = radius * 0.45;
    const cx = Math.cos(angle) * dist;
    const cy = Math.sin(angle) * dist;
    primitives.push({ type: "circle", cx, cy, r: radius * 0.15, stroke: palette.accent, strokeWidth: 2.5 });
  }
  return primitives;
};

export const mugObstacleDrawer: DrawerSpec<ObstacleDrawerParams> = ({ radius, palette }) => [
  { type: "circle", cx: 4, cy: 5, r: radius, fill: palette.shadow, alpha: 0.32 },
  { type: "circle", cx: radius * 0.95, cy: 0, r: radius * 0.35, fill: palette.obstacle, stroke: palette.outline, strokeWidth: 2 },
  { type: "circle", cx: 0, cy: 0, r: radius, fill: palette.obstacle, stroke: palette.outline, strokeWidth: 2 },
  { type: "circle", cx: 0, cy: 0, r: radius * 0.78, fill: "#3D2314" },
  { type: "arc", cx: -radius * 0.2, cy: -radius * 0.2, r: radius * 0.3, startAngle: 0.4, endAngle: Math.PI * 1.2, stroke: "#8C5638", strokeWidth: 1.5 }
];

export const billiardBallObstacleDrawer: DrawerSpec<ObstacleDrawerParams> = ({ radius, id, palette }) => {
  const isEight = id.includes("eight") || id.includes("8");
  const isCue = id.includes("cue");
  const baseColor = isCue ? "#FFFFFF" : isEight ? "#111827" : palette.obstacle;

  const primitives: RenderPrimitive[] = [
    { type: "circle", cx: 4, cy: 5, r: radius, fill: palette.shadow, alpha: 0.32 },
    { type: "circle", cx: 0, cy: 0, r: radius, fill: baseColor, stroke: palette.outline, strokeWidth: 2 },
    { type: "circle", cx: -radius * 0.3, cy: -radius * 0.3, r: radius * 0.35, fill: "#FFFFFF", alpha: 0.4 }
  ];

  if (!isCue) {
    primitives.push(
      { type: "circle", cx: 0, cy: 0, r: radius * 0.4, fill: "#FFFFFF" },
      { type: "text", x: 0, y: 0, text: isEight ? "8" : "1", fontSize: Math.round(radius * 0.55), fill: "#000000", align: "center", baseline: "middle" }
    );
  }

  return primitives;
};

export const asteroidObstacleDrawer: DrawerSpec<ObstacleDrawerParams> = ({ radius, palette }) => [
  { type: "circle", cx: 4, cy: 5, r: radius, fill: palette.shadow, alpha: 0.4 },
  {
    type: "path",
    points: [
      { x: 0, y: -radius },
      { x: radius * 0.7, y: -radius * 0.7 },
      { x: radius, y: 0 },
      { x: radius * 0.8, y: radius * 0.8 },
      { x: 0, y: radius },
      { x: -radius * 0.9, y: radius * 0.6 },
      { x: -radius, y: -0.2 * radius },
      { x: -radius * 0.6, y: -radius * 0.8 }
    ],
    closed: true,
    fill: "#4a4e69",
    stroke: "#9a8c98",
    strokeWidth: 2
  },
  { type: "circle", cx: -radius * 0.3, cy: -radius * 0.3, r: radius * 0.2, fill: "#22223b" },
  { type: "circle", cx: radius * 0.3, cy: radius * 0.2, r: radius * 0.25, fill: "#22223b" }
];

export const defaultObstacleDrawer: DrawerSpec<ObstacleDrawerParams> = ({ radius, palette }) => [
  { type: "circle", cx: 4, cy: 5, r: radius, fill: palette.shadow, alpha: 0.32 },
  { type: "circle", cx: 0, cy: 0, r: radius, fill: palette.obstacle, stroke: palette.outline, strokeWidth: 2 }
];

// Zone Drawers
export const waterZoneDrawer: DrawerSpec<ZoneDrawerParams> = ({ width, height, palette }) => {
  const halfW = width / 2;
  const halfH = height / 2;
  return [
    { type: "ellipse", cx: 0, cy: 0, rx: halfW, ry: halfH, fill: "#FFFDF0", stroke: palette.player, strokeWidth: 2 },
    { type: "arc", cx: -halfW * 0.3, cy: -halfH * 0.3, r: halfW * 0.3, startAngle: 0.2, endAngle: Math.PI * 0.9, stroke: "#FFFFFF", strokeWidth: 1.5, alpha: 0.7 }
  ];
};

export const oilZoneDrawer: DrawerSpec<ZoneDrawerParams> = ({ width, height }) => {
  const halfW = width / 2;
  const halfH = height / 2;
  return [
    { type: "ellipse", cx: 0, cy: 0, rx: halfW, ry: halfH, rotation: 0.2, fill: "rgba(25, 25, 30, 0.75)" },
    { type: "arc", cx: -halfW * 0.1, cy: -halfH * 0.1, r: halfW * 0.4, startAngle: 0, endAngle: Math.PI, stroke: "#00e5ff", strokeWidth: 2, alpha: 0.5 },
    { type: "arc", cx: halfW * 0.1, cy: halfH * 0.1, r: halfW * 0.3, startAngle: Math.PI, endAngle: Math.PI * 2, stroke: "#ff2a6d", strokeWidth: 2 }
  ];
};

export const deadlyEdgeZoneDrawer: DrawerSpec<ZoneDrawerParams> = ({ width, height, palette }) => {
  const halfW = width / 2;
  const halfH = height / 2;
  const primitives: RenderPrimitive[] = [
    { type: "rect", x: -halfW, y: -halfH, w: width, h: height, fill: palette.accent }
  ];
  for (let x = -halfW - height; x < halfW + height; x += 20) {
    primitives.push({
      type: "path",
      points: [
        { x, y: -halfH },
        { x: x + 12, y: -halfH },
        { x: x - 8, y: halfH },
        { x: x - 20, y: halfH }
      ],
      closed: true,
      fill: palette.outline
    });
  }
  return primitives;
};

export const lavaZoneDrawer: DrawerSpec<ZoneDrawerParams> = ({ width, height }) => {
  const halfW = width / 2;
  const halfH = height / 2;
  return [
    { type: "ellipse", cx: 0, cy: 0, rx: halfW, ry: halfH, fill: "rgba(255, 60, 0, 0.65)", stroke: "#ff0000", strokeWidth: 2 },
    { type: "ellipse", cx: 0, cy: 0, rx: halfW * 0.6, ry: halfH * 0.6, fill: "rgba(255, 200, 0, 0.8)" }
  ];
};

export const defaultZoneDrawer: DrawerSpec<ZoneDrawerParams> = ({ width, height, palette }) => [
  { type: "circle", cx: 0, cy: 0, r: Math.max(width, height) / 2, fill: palette.danger, alpha: 0.35 }
];

// Wall Drawer
export const defaultWallDrawer: DrawerSpec<WallDrawerParams> = ({ width, height, palette }) => {
  const halfW = width / 2;
  const halfH = height / 2;
  const depth = 5;
  return [
    { type: "rect", x: -halfW + 5, y: -halfH + 6, w: width, h: height, fill: palette.shadow, alpha: 0.3 },
    {
      type: "path",
      points: [
        { x: -halfW, y: halfH },
        { x: -halfW + depth, y: halfH + depth },
        { x: halfW + depth, y: halfH + depth },
        { x: halfW + depth, y: -halfH + depth },
        { x: halfW, y: -halfH },
        { x: halfW, y: halfH }
      ],
      closed: true,
      fill: palette.outline
    },
    { type: "rect", x: -halfW, y: -halfH, w: width, h: height, fill: palette.trackEdge, stroke: palette.outline, strokeWidth: 1.5 },
    { type: "rect", x: -halfW, y: -halfH, w: width, h: 2.5, fill: palette.track }
  ];
};

export const spaceWallDrawer: DrawerSpec<WallDrawerParams> = ({ width, height, palette }) => {
  const halfW = width / 2;
  const halfH = height / 2;
  return [
    { type: "rect", x: -halfW, y: -halfH, w: width, h: height, fill: "#181c33", stroke: "#00f0ff", strokeWidth: 2 },
    { type: "rect", x: -halfW, y: -halfH, w: width, h: Math.min(height, 4), fill: "#ff007f" }
  ];
};

const commonTabletopObstacles = {
  bowl: bowlObstacleDrawer,
  mug: mugObstacleDrawer,
  billiard_ball: billiardBallObstacleDrawer
};

const commonTabletopZones = {
  water: waterZoneDrawer,
  oil: oilZoneDrawer,
  deadly_edge: deadlyEdgeZoneDrawer
};

// Registered Skins
export const breakfastSkin: RacingSkin = {
  id: "breakfast",
  palette: RACING_PALETTES.breakfast,
  surfacePattern: "wood",
  obstacleDrawers: {
    bowl: bowlObstacleDrawer,
    mug: mugObstacleDrawer
  },
  zoneDrawers: {
    water: waterZoneDrawer,
    deadly_edge: deadlyEdgeZoneDrawer
  },
  wallDrawer: defaultWallDrawer,
  actorDrawer: defaultCarActorDrawer,
  finishCheckers: ["#FFFFFF", "#5D4037"],
  ui: { glowColor: "#55C9CE", accentColor: "#F2C94C" }
};

export const billiardSkin: RacingSkin = {
  id: "billiard",
  palette: RACING_PALETTES.billiard,
  surfacePattern: "diagonal",
  obstacleDrawers: {
    billiard_ball: billiardBallObstacleDrawer
  },
  zoneDrawers: {
    oil: oilZoneDrawer
  },
  wallDrawer: defaultWallDrawer,
  actorDrawer: defaultCarActorDrawer,
  finishCheckers: ["#FFFFF0", "#1B5E20"],
  ui: { glowColor: "#53C8C2", accentColor: "#F2C94C" }
};

export const deskSkin: RacingSkin = {
  id: "desk",
  palette: RACING_PALETTES.desk,
  surfacePattern: "wood",
  obstacleDrawers: commonTabletopObstacles,
  zoneDrawers: commonTabletopZones,
  wallDrawer: defaultWallDrawer,
  actorDrawer: defaultCarActorDrawer,
  finishCheckers: ["#FFFFFF", "#5D4037"],
  ui: { glowColor: "#4FA7D8", accentColor: "#F2C94C" }
};

export const gardenSkin: RacingSkin = {
  id: "garden",
  palette: RACING_PALETTES.garden,
  surfacePattern: "none",
  obstacleDrawers: commonTabletopObstacles,
  zoneDrawers: commonTabletopZones,
  wallDrawer: defaultWallDrawer,
  actorDrawer: defaultCarActorDrawer,
  finishCheckers: ["#FFFFFF", "#5D4037"],
  ui: { glowColor: "#58BBA0", accentColor: "#F2C94C" }
};

export const spaceSkin: RacingSkin = {
  id: "space",
  palette: {
    surface: "#0b0d19",
    surfaceDetail: "#181c33",
    track: "#2a1b4e",
    trackEdge: "#5c248b",
    player: "#ff007f",
    playerHighlight: "#ff66b3",
    rival: "#ffe600",
    rivalHighlight: "#ffff80",
    obstacle: "#4a4e69",
    obstacleHighlight: "#9a8c98",
    danger: "#ff2a6d",
    shadow: "#05060a",
    accent: "#00f0ff",
    outline: "#0d0e15",
    text: "#ffffff"
  },
  surfacePattern: "starfield",
  obstacleDrawers: {
    asteroid: asteroidObstacleDrawer,
    bowl: bowlObstacleDrawer,
    mug: mugObstacleDrawer
  },
  zoneDrawers: {
    lava: lavaZoneDrawer,
    water: waterZoneDrawer,
    oil: oilZoneDrawer
  },
  wallDrawer: spaceWallDrawer,
  actorDrawer: spaceshipActorDrawer,
  finishCheckers: ["#00f0ff", "#ff007f"],
  ui: { glowColor: "#00f0ff", accentColor: "#ff007f" }
};

export const SKIN_REGISTRY: Record<string, RacingSkin> = {
  breakfast: breakfastSkin,
  billiard: billiardSkin,
  desk: deskSkin,
  garden: gardenSkin,
  space: spaceSkin,
  tabletop: breakfastSkin
};

export function getRacingSkin(world: World<RacingComponentRegistry, any>): RacingSkin {
  const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
  const skinKey = trackSpec?.skin ?? trackSpec?.theme ?? "breakfast";
  return SKIN_REGISTRY[skinKey] ?? SKIN_REGISTRY.breakfast;
}

// Interpreters
export function interpretCanvas(ctx: CanvasRenderingContext2D, primitives: RenderPrimitive[]): void {
  for (let i = 0; i < primitives.length; i += 1) {
    const p = primitives[i]!;
    ctx.save();
    if (p.alpha !== undefined) ctx.globalAlpha *= p.alpha;

    if (p.type === "group") {
      if (p.x || p.y) ctx.translate(p.x ?? 0, p.y ?? 0);
      if (p.rotation) ctx.rotate(p.rotation);
      if (p.scaleX !== undefined || p.scaleY !== undefined) ctx.scale(p.scaleX ?? 1, p.scaleY ?? 1);
      interpretCanvas(ctx, p.children);
      ctx.restore();
      continue;
    }

    if (p.type === "rect") {
      if (p.fill) { ctx.fillStyle = p.fill; ctx.fillRect(p.x, p.y, p.w, p.h); }
      if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.strokeWidth ?? 1; ctx.strokeRect(p.x, p.y, p.w, p.h); }
    } else if (p.type === "line") {
      ctx.beginPath();
      ctx.moveTo(p.x1, p.y1);
      ctx.lineTo(p.x2, p.y2);
      ctx.strokeStyle = p.stroke;
      ctx.lineWidth = p.strokeWidth ?? 1;
      if (p.lineCap) ctx.lineCap = p.lineCap;
      ctx.stroke();
    } else if (p.type === "text") {
      ctx.font = `bold ${p.fontSize}px sans-serif`;
      if (p.align) ctx.textAlign = p.align;
      if (p.baseline) ctx.textBaseline = p.baseline;
      ctx.fillStyle = p.fill;
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.beginPath();
      if (p.type === "roundRect") {
        typeof ctx.roundRect === "function" ? ctx.roundRect(p.x, p.y, p.w, p.h, p.r) : ctx.rect(p.x, p.y, p.w, p.h);
      } else if (p.type === "circle") {
        ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
      } else if (p.type === "ellipse") {
        ctx.ellipse(p.cx, p.cy, p.rx, p.ry, p.rotation ?? 0, 0, Math.PI * 2);
      } else if (p.type === "arc") {
        ctx.arc(p.cx, p.cy, p.r, p.startAngle, p.endAngle);
      } else if (p.type === "path" && p.points.length > 0) {
        ctx.moveTo(p.points[0]!.x, p.points[0]!.y);
        for (let k = 1; k < p.points.length; k += 1) ctx.lineTo(p.points[k]!.x, p.points[k]!.y);
        if (p.closed) ctx.closePath();
      }
      if (p.fill) { ctx.fillStyle = p.fill; ctx.fill(); }
      if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.strokeWidth ?? 1; ctx.stroke(); }
    }
    ctx.restore();
  }
}

function makeSkiaFillPaint(color: string, alpha?: number) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setStyle(Skia.PaintStyle.Fill);
  if (alpha !== undefined) paint.setAlphaf(alpha);
  return paint;
}

function makeSkiaStrokePaint(color: string, width?: number, alpha?: number) {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(width ?? 1);
  if (alpha !== undefined) paint.setAlphaf(alpha);
  return paint;
}

export function interpretSkia(canvas: SkCanvas, primitives: RenderPrimitive[]): void {
  if (!Skia) return;

  for (let i = 0; i < primitives.length; i += 1) {
    const p = primitives[i]!;
    canvas.save();

    if (p.type === "group") {
      if (p.x || p.y) canvas.translate(p.x ?? 0, p.y ?? 0);
      if (p.rotation) canvas.rotate((p.rotation * 180) / Math.PI, 0, 0);
      if (p.scaleX !== undefined || p.scaleY !== undefined) {
        canvas.scale(p.scaleX ?? 1, p.scaleY ?? 1);
      }
      interpretSkia(canvas, p.children);
      canvas.restore();
      continue;
    }

    if (p.type === "rect") {
      if (p.fill) canvas.drawRect(Skia.XYWHRect(p.x, p.y, p.w, p.h), makeSkiaFillPaint(p.fill, p.alpha));
      if (p.stroke) canvas.drawRect(Skia.XYWHRect(p.x, p.y, p.w, p.h), makeSkiaStrokePaint(p.stroke, p.strokeWidth, p.alpha));
    } else if (p.type === "roundRect") {
      const rrect = Skia.RRectXY(Skia.XYWHRect(p.x, p.y, p.w, p.h), p.r, p.r);
      if (p.fill) canvas.drawRRect(rrect, makeSkiaFillPaint(p.fill, p.alpha));
      if (p.stroke) canvas.drawRRect(rrect, makeSkiaStrokePaint(p.stroke, p.strokeWidth, p.alpha));
    } else if (p.type === "circle") {
      if (p.fill) canvas.drawCircle(p.cx, p.cy, p.r, makeSkiaFillPaint(p.fill, p.alpha));
      if (p.stroke) canvas.drawCircle(p.cx, p.cy, p.r, makeSkiaStrokePaint(p.stroke, p.strokeWidth, p.alpha));
    } else if (p.type === "ellipse") {
      const rect = Skia.XYWHRect(p.cx - p.rx, p.cy - p.ry, p.rx * 2, p.ry * 2);
      if (p.rotation) canvas.rotate((p.rotation * 180) / Math.PI, p.cx, p.cy);
      if (p.fill) canvas.drawOval(rect, makeSkiaFillPaint(p.fill, p.alpha));
      if (p.stroke) canvas.drawOval(rect, makeSkiaStrokePaint(p.stroke, p.strokeWidth, p.alpha));
    } else if (p.type === "arc") {
      const rect = Skia.XYWHRect(p.cx - p.r, p.cy - p.r, p.r * 2, p.r * 2);
      const startDeg = (p.startAngle * 180) / Math.PI;
      const sweepDeg = ((p.endAngle - p.startAngle) * 180) / Math.PI;
      if (p.fill) canvas.drawArc(rect, startDeg, sweepDeg, true, makeSkiaFillPaint(p.fill, p.alpha));
      if (p.stroke) canvas.drawArc(rect, startDeg, sweepDeg, false, makeSkiaStrokePaint(p.stroke, p.strokeWidth, p.alpha));
    } else if (p.type === "line") {
      canvas.drawLine(p.x1, p.y1, p.x2, p.y2, makeSkiaStrokePaint(p.stroke, p.strokeWidth, p.alpha));
    } else if (p.type === "path") {
      if (p.points.length > 0) {
        const path = Skia.Path.Make();
        path.moveTo(p.points[0]!.x, p.points[0]!.y);
        for (let k = 1; k < p.points.length; k += 1) {
          path.lineTo(p.points[k]!.x, p.points[k]!.y);
        }
        if (p.closed) path.close();
        if (p.fill) canvas.drawPath(path, makeSkiaFillPaint(p.fill, p.alpha));
        if (p.stroke) canvas.drawPath(path, makeSkiaStrokePaint(p.stroke, p.strokeWidth, p.alpha));
      }
    }
    canvas.restore();
  }
}
