/**
 * Iterates over a grid of block cells for canvas grid-based transitions.
 *
 * @param width - Total width of the canvas or grid area.
 * @param height - Total height of the canvas or grid area.
 * @param blockSize - Size in pixels of each grid block cell.
 * @param callback - Function invoked for each grid cell with `(col, row, cellX, cellY, cols, rows)`.
 * @public
 */
export function iterateGridBlocks(
  width: number,
  height: number,
  blockSize: number,
  callback: (col: number, row: number, cellX: number, cellY: number, cols: number, rows: number) => void
): void {
  const cols = Math.ceil(width / blockSize);
  const rows = Math.ceil(height / blockSize);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      callback(c, r, c * blockSize, r * blockSize, cols, rows);
    }
  }
}
