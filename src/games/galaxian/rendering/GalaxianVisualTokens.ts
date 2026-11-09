export type Polygon2D = ReadonlyArray<readonly [number, number]>;

export const ORIGAMI_BIRD_POLYGONS = {
  leftBody: [
    [0, -8],
    [0, 10],
    [-4.5, 0],
  ] as const,
  rightBody: [
    [0, -8],
    [4.5, 0],
    [0, 10],
  ] as const,
  leftWingTop: [
    [-4, -2],
    [-15, -10],
    [-13, 2],
  ] as const,
  leftWingBottom: [
    [-4, -2],
    [-13, 2],
    [-4, 6],
  ] as const,
  rightWingTop: [
    [4, -2],
    [15, -10],
    [13, 2],
  ] as const,
  rightWingBottom: [
    [4, -2],
    [13, 2],
    [4, 6],
  ] as const,
  emissaryHookLeft: [
    [-15, -10],
    [-19, -4],
    [-13, 2],
  ] as const,
  emissaryHookRight: [
    [15, -10],
    [19, -4],
    [13, 2],
  ] as const,
  escortHornLeft: [
    [-2, 6],
    [-6, 12],
    [-1, 8],
  ] as const,
  escortHornRight: [
    [2, 6],
    [6, 12],
    [1, 8],
  ] as const,
  flagshipCrest: [
    [0, -8],
    [3, -13],
    [0, -18],
    [-3, -13],
  ] as const,
  head: [
    [0, 10],
    [-2.6, 5],
    [2.6, 5],
  ] as const,
} as const;

export const PLAYER_SHIP_POLYGONS = {
  leftWing: [
    [0, -16],
    [-14, 10],
    [0, 4],
  ] as const,
  rightWing: [
    [0, -16],
    [14, 10],
    [0, 4],
  ] as const,
  tail: [
    [0, 4],
    [-5, 13],
    [0, 10],
    [5, 13],
  ] as const,
} as const;
