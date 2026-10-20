import { GridLayout } from "../../shared/grid/GridTypes";
import { cellCenterToWorld, cellToWorld } from "../../shared/grid/GridGeometry";
import { CentipedeConfig } from "../types/CentipedeConfigSchema";

export function getCentipedeGridLayout(config: CentipedeConfig): GridLayout {
  return {
    stepX: config.CELL_SIZE,
    stepY: config.CELL_SIZE,
    offsetX: 0,
    offsetY: 0,
  };
}

export function gridToWorldCenter(config: CentipedeConfig, row: number, col: number) {
  const layout = getCentipedeGridLayout(config);
  return cellCenterToWorld(layout, { row, col });
}

export function gridToWorldCorner(config: CentipedeConfig, row: number, col: number) {
  const layout = getCentipedeGridLayout(config);
  return cellToWorld(layout, { row, col });
}

export function hashCellSeed(row: number, col: number, levelSeed: number): number {
  let h = (row * 31 + col * 97 + levelSeed * 1013) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}
