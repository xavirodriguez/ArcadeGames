import { GridLayout, GridCoordinates } from "./GridTypes";

/** True si row/col están dentro de [0, rows) x [0, cols). No muta ni corrige. */
export function isInBounds(rows: number, cols: number, coordinates: GridCoordinates): boolean {
  return (
    coordinates.row >= 0 &&
    coordinates.row < rows &&
    coordinates.col >= 0 &&
    coordinates.col < cols
  );
}

/** Devuelve una copia de coordinates recortada a los límites del tablero. */
export function clampCoordinates(rows: number, cols: number, coordinates: GridCoordinates): GridCoordinates {
  const maxRow = Math.max(0, rows - 1);
  const maxCol = Math.max(0, cols - 1);

  return {
    row: Math.max(0, Math.min(maxRow, coordinates.row)),
    col: Math.max(0, Math.min(maxCol, coordinates.col)),
  };
}

/** Lanza Error si layout tiene stepX/stepY <= 0 o no finitos, u offsetX/offsetY no finitos. */
export function assertValidGridLayout(layout: GridLayout): void {
  if (!Number.isFinite(layout.stepX) || layout.stepX <= 0) {
    throw new Error(`Invalid grid stepX: ${layout.stepX}`);
  }
  if (!Number.isFinite(layout.stepY) || layout.stepY <= 0) {
    throw new Error(`Invalid grid stepY: ${layout.stepY}`);
  }
  if (!Number.isFinite(layout.offsetX)) {
    throw new Error(`Invalid grid offsetX: ${layout.offsetX}`);
  }
  if (!Number.isFinite(layout.offsetY)) {
    throw new Error(`Invalid grid offsetY: ${layout.offsetY}`);
  }
}
