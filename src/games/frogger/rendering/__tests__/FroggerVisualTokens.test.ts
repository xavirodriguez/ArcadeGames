import {
  FROGGER_BACKGROUND_ROWS,
  FROGGER_VISUAL_REFERENCE,
  FROGGER_VISUAL_TOKENS,
} from "../FroggerVisualTokens";
import { DEFAULT_FROGGER_CONFIG } from "../../types/FroggerConfigSchema";

describe("Frogger visual reference contract", () => {
  it("keeps the approved portrait reference separate from logical grid sizing", () => {
    const { viewport, logicalGrid } = FROGGER_VISUAL_REFERENCE;

    expect(viewport).toEqual({
      width: 390,
      height: 844,
      hudHeight: 90,
      playfieldHeight: 754,
    });
    expect(viewport.hudHeight + viewport.playfieldHeight).toBe(viewport.height);
    expect(logicalGrid).toEqual({
      columns: DEFAULT_FROGGER_CONFIG.TOTAL_COLS,
      rows: DEFAULT_FROGGER_CONFIG.TOTAL_ROWS,
      cellSize: DEFAULT_FROGGER_CONFIG.GRID_SIZE,
    });

    // The reference screenshot is not a source of truth for simulation dimensions.
    expect(logicalGrid.columns * logicalGrid.cellSize).toBe(800);
    expect(logicalGrid.rows * logicalGrid.cellSize).toBe(600);
  });

  it("keeps the background zones contiguous across the complete logical board", () => {
    const rows = FROGGER_BACKGROUND_ROWS;
    const config = DEFAULT_FROGGER_CONFIG;

    expect(rows.goalBank).toBe(0);
    expect(rows.riverStart).toBe(rows.goalBank + 1);
    expect(rows.median).toBe(rows.riverStart + rows.riverRows);
    expect(rows.roadStart).toBe(rows.median + 1);
    expect(rows.startBank).toBe(rows.roadStart + rows.roadRows);
    expect(rows.startBank + rows.startRows).toBe(config.TOTAL_ROWS);
  });

  it("exposes the agreed warm sunset palette through semantic tokens", () => {
    expect(FROGGER_VISUAL_TOKENS.frog.body).toBe("#B6F23C");
    expect(FROGGER_VISUAL_TOKENS.frog.eyes).toBe("#F2EEE3");
    expect(FROGGER_VISUAL_TOKENS.frog.pupils).toBe("#232338");

    expect(FROGGER_VISUAL_TOKENS.surfaces.asphalt).toBe("#232338");
    expect(FROGGER_VISUAL_TOKENS.surfaces.bank).toBe("#E9B949");
    expect(FROGGER_VISUAL_TOKENS.surfaces.riverDeep).toBe("#0F6E7A");
    expect(FROGGER_VISUAL_TOKENS.surfaces.riverShallow).toBe("#17A3A3");

    expect(FROGGER_VISUAL_TOKENS.logs.body).toBe("#B9824A");
    expect(FROGGER_VISUAL_TOKENS.turtles.body).toBe("#2F8F7A");
    expect(FROGGER_VISUAL_TOKENS.crocodile.body).toBe("#4C7F5E");
    expect(FROGGER_VISUAL_TOKENS.lilyPads.body).toBe("#3FA373");
    expect(FROGGER_VISUAL_TOKENS.vehicles.cars).toEqual([
      "#5B6FB5",
      "#8B63A8",
      "#9A9AB8",
      "#C07A9A",
      "#7FA6D6",
    ]);
  });
});
