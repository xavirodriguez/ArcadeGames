import { System, SystemPhase, World } from "@tiny-aster/core";
import type {
  TowerDefenseComponentRegistry,
  TowerDefenseEventRegistry,
  TileGrid,
  TowerCatalog,
  GameStateComponent,
} from "../types/TowerDefenseTypes";
import type { GridLayout } from "../../shared/grid/GridTypes";
import { isBuildable, worldToCellCoords } from "../MapUtils";
import { queryPlayerEntity } from "../../shared/networkUtils";

/**
 * Handles build / sell / upgrade from Input.
 * Rule: towers only on `buildable` tiles (no path blocking → no dynamic pathfinding needed).
 */
export class BuildSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  readonly phase = SystemPhase.Input;

  private getTowerAtCell(
    world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>,
    col: number,
    row: number
  ) {
    return world.query("Tower").find((e) => {
      const t = world.getComponent(e, "Tower");
      return t && t.col === col && t.row === row;
    });
  }

  private tryBuild(
    world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>,
    selectedTowerType: string | null | undefined,
    cell: { col: number; row: number },
    tileGrid: TileGrid,
    catalog: TowerCatalog,
    gs: GameStateComponent
  ): boolean {
    const bus = world.getEventBus();
    if (!selectedTowerType) {
      bus?.emit("tower:build_failed", { reason: "no_tower_selected", col: cell.col, row: cell.row });
      return false;
    }
    const def = catalog[selectedTowerType];
    if (!def) {
      bus?.emit("tower:build_failed", { reason: "invalid_tower_type", col: cell.col, row: cell.row });
      return false;
    }
    if (cell.col < 0 || cell.row < 0 || cell.col >= tileGrid.cols || cell.row >= tileGrid.rows) {
      bus?.emit("tower:build_failed", { reason: "out_of_bounds", col: cell.col, row: cell.row });
      return false;
    }
    if (!isBuildable(tileGrid, cell.col, cell.row)) {
      bus?.emit("tower:build_failed", { reason: "not_buildable", col: cell.col, row: cell.row });
      return false;
    }

    if (this.getTowerAtCell(world, cell.col, cell.row) !== undefined) {
      bus?.emit("tower:build_failed", { reason: "cell_occupied", col: cell.col, row: cell.row });
      return false;
    }
    if (gs.gold < def.cost) {
      bus?.emit("tower:build_failed", {
        reason: "insufficient_gold",
        col: cell.col,
        row: cell.row,
        cost: def.cost,
        gold: gs.gold,
      });
      return false;
    }

    world.mutateSingleton("GameState", (g: GameStateComponent) => {
      g.gold -= def.cost;
    });

    world.commands.spawnFromBlueprint("tower", {
      type: def.id,
      col: cell.col,
      row: cell.row,
    });

    bus?.emit("tower:built", {
      entity: 0,
      towerType: def.id,
      col: cell.col,
      row: cell.row,
    });

    return true;
  }

  update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, _dt: number): void {
    const playerEntity = queryPlayerEntity(world);
    if (playerEntity === undefined) return;

    const input = world.getComponent(playerEntity, "Input");
    const player = world.getComponent(playerEntity, "Player");
    if (!input || !player) return;

    const gs = world.getSingleton("GameState") as GameStateComponent | undefined;
    if (!gs || gs.phase === "game_over" || gs.phase === "victory") return;

    const tileGrid = world.getResource<TileGrid>("TileGrid");
    const layout = world.getResource<GridLayout>("GridLayout");
    const catalog = world.getResource<TowerCatalog>("TowerCatalog");
    if (!tileGrid || !layout || !catalog) return;

    const cell = worldToCellCoords(input.cursorX, input.cursorY, layout);
    world.mutateComponent(playerEntity, "Player", (p) => {
      p.selectedCell = cell;
    });
    if (player.selectedTowerType && gs.selectedTowerType !== player.selectedTowerType) {
      world.mutateSingleton("GameState", (g: GameStateComponent) => {
        g.selectedTowerType = player.selectedTowerType;
      });
    }

    if (input.build) {
      this.tryBuild(world, player.selectedTowerType, cell, tileGrid, catalog, gs);
      world.mutateComponent(playerEntity, "Input", (i) => {
        i.build = false;
      });
    }

    if (input.sell) {
      const towerAtCell = this.getTowerAtCell(world, cell.col, cell.row);
      if (towerAtCell !== undefined) {
        const tower = world.getComponent(towerAtCell, "Tower")!;
        const refund = Math.floor(tower.cost * 0.6 * tower.level);
        world.mutateSingleton("GameState", (g: GameStateComponent) => {
          g.gold += refund;
        });
        world.getEventBus()?.emit("tower:sold", { entity: towerAtCell, refund });
        world.commands.removeEntity(towerAtCell);
      } else {
        world.getEventBus()?.emit("tower:sell_failed", {
          reason: "no_tower_at_cell",
          col: cell.col,
          row: cell.row,
        });
      }
      world.mutateComponent(playerEntity, "Input", (i) => {
        i.sell = false;
      });
    }

    if (input.upgrade) {
      const towerAtCell = this.getTowerAtCell(world, cell.col, cell.row);
      if (towerAtCell === undefined) {
        world.getEventBus()?.emit("tower:upgrade_failed", {
          reason: "no_tower_at_cell",
          col: cell.col,
          row: cell.row,
        });
      } else {
        const tower = world.getComponent(towerAtCell, "Tower")!;
        if (tower.level >= tower.maxLevel) {
          world.getEventBus()?.emit("tower:upgrade_failed", {
            reason: "max_level_reached",
            col: cell.col,
            row: cell.row,
            level: tower.level,
          });
        } else {
          const upgradeCost = Math.floor(tower.cost * 0.8 * tower.level);
          if (gs.gold < upgradeCost) {
            world.getEventBus()?.emit("tower:upgrade_failed", {
              reason: "insufficient_gold",
              col: cell.col,
              row: cell.row,
              upgradeCost,
              gold: gs.gold,
            });
          } else {
            world.mutateSingleton("GameState", (g: GameStateComponent) => {
              g.gold -= upgradeCost;
            });
            world.mutateComponent(towerAtCell, "Tower", (t) => {
              t.level += 1;
              t.damage = Math.floor(t.damage * 1.35);
              t.range = Math.floor(t.range * 1.1);
              t.fireRate = t.fireRate * 1.1;
            });
            world.getEventBus()?.emit("tower:upgraded", {
              entity: towerAtCell,
              level: tower.level + 1,
            });
          }
        }
      }
      world.mutateComponent(playerEntity, "Input", (i) => {
        i.upgrade = false;
      });
    }
  }
}
