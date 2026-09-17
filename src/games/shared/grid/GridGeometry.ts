import { GridLayout, GridCoordinates, WorldPosition } from "./GridTypes";

/** Posición de la esquina superior izquierda de la celda en coordenadas de mundo. */
export function cellToWorld(layout: GridLayout, coordinates: GridCoordinates): WorldPosition {
  return {
    x: layout.offsetX + coordinates.col * layout.stepX,
    y: layout.offsetY + coordinates.row * layout.stepY,
  };
}

/** Posición del centro de la celda, derivada de cellToWorld + stepX/2, stepY/2. */
export function cellCenterToWorld(layout: GridLayout, coordinates: GridCoordinates): WorldPosition {
  const origin = cellToWorld(layout, coordinates);
  return {
    x: origin.x + layout.stepX / 2,
    y: origin.y + layout.stepY / 2,
  };
}

/** Inversa de cellToWorld: dada una posición de mundo, calcula la celda contenedora (sin clamping, puede devolver índices fuera de rango). */
export function worldToCell(layout: GridLayout, position: WorldPosition): GridCoordinates {
  return {
    row: Math.floor((position.y - layout.offsetY) / layout.stepY),
    col: Math.floor((position.x - layout.offsetX) / layout.stepX),
  };
}
