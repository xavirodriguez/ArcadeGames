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

/**
 * Handles build / sell / upgrade from Input.
 * Rule: towers only on `buildable` tiles (no path blocking → no dynamic pathfinding needed).
 */
export class BuildSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  readonly phase = SystemPhase.Input;

  update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, _dt: number): void {
    const playerEntity = world.query("Player")[0];
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

    if (input.build && player.selectedTowerType) {
      const def = catalog[player.selectedTowerType];
      if (!def) return;
      if (!isBuildable(tileGrid, cell.col, cell.row)) return;

      const existing = world.query("Tower").find((e) => {
        const t = world.getComponent(e, "Tower");
        return t && t.col === cell.col && t.row === cell.row;
      });
      if (existing !== undefined) return;
      if (gs.gold < def.cost) return;

      world.mutateSingleton("GameState", (g: GameStateComponent) => {
        g.gold -= def.cost;
      });

      world.commands.spawnFromBlueprint("tower", {
        type: def.id,
        col: cell.col,
        row: cell.row,
      });

      world.getEventBus()?.emit("tower:built", {
        entity: 0,
        towerType: def.id,
        col: cell.col,
        row: cell.row,
      });

      world.mutateComponent(playerEntity, "Input", (i) => {
        i.build = false;
      });
    }

        // TODO(refactor): código duplicado detectado (bloque) con tower-defense/systems/BuildSystem.ts:98-104. Considerar extraer a función compartida. Ref: ed76935f
if (input.sell) {
      const towerAtCell = world.query("Tower").find((e) => {
        const t = world.getComponent(e, "Tower");
        return t && t.col === cell.col && t.row === cell.row;
      });
      if (towerAtCell !== undefined) {
        const tower = world.getComponent(towerAtCell, "Tower")!;
        const refund = Math.floor(tower.cost * 0.6 * tower.level);
        world.mutateSingleton("GameState", (g: GameStateComponent) => {
          g.gold += refund;
        });
        world.getEventBus()?.emit("tower:sold", { entity: towerAtCell, refund });
        world.commands.removeEntity(towerAtCell);
      }
      world.mutateComponent(playerEntity, "Input", (i) => {
        i.sell = false;
      });
    }

    if (input.upgrade) {
            // TODO(refactor): código duplicado detectado (bloque) con tower-defense/systems/BuildSystem.ts:80-86. Considerar extraer a función compartida. Ref: c2403674
const towerAtCell = world.query("Tower").find((e) => {
        const t = world.getComponent(e, "Tower");
        return t && t.col === cell.col && t.row === cell.row;
      });
      if (towerAtCell !== undefined) {
        const tower = world.getComponent(towerAtCell, "Tower")!;
        if (tower.level < tower.maxLevel) {
          const upgradeCost = Math.floor(tower.cost * 0.8 * tower.level);
          if (gs.gold >= upgradeCost) {
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
