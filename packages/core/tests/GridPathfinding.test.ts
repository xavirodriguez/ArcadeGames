import {
  GridPathfinding,
  GridPassabilityMap,
  CARDINAL_DIRECTIONS,
} from "../src/ai/GridPathfinding";
import { RandomService } from "../src/utils/RandomService";

describe("GridPathfinding Tests", () => {
  // Simple 10x10 grid helper
  class SimpleGrid implements GridPassabilityMap {
    public width = 10;
    public height = 10;
    public obstacles = new Set<string>();
    public costs = new Map<string, number>();

    public isWalkable(x: number, y: number): boolean {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
      return !this.obstacles.has(`${x},${y}`);
    }

    public getCost(x: number, y: number): number {
      return this.costs.get(`${x},${y}`) ?? 1;
    }
  }

  let grid: SimpleGrid;

  beforeEach(() => {
    grid = new SimpleGrid();
  });

  describe("BFS Pathfinding", () => {
    it("should find the shortest path in an open grid", () => {
      const path = GridPathfinding.bfs(grid, { x: 0, y: 0 }, { x: 3, y: 0 });
      expect(path).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ]);
    });

    it("should navigate around obstacles using BFS", () => {
      // Block (1, 0)
      grid.obstacles.add("1,0");

      const path = GridPathfinding.bfs(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
      // Shortest route around (1, 0) via (0, 1) -> (1, 1) -> (2, 1) -> (2, 0)
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1]).toEqual({ x: 2, y: 0 });
      // Ensure path avoids (1, 0)
      for (const pt of path) {
        expect(`${pt.x},${pt.y}`).not.toBe("1,0");
      }
    });

    it("should return empty array if target is unwalkable or unreachable", () => {
      grid.obstacles.add("2,0");
      const pathUnwalkableTarget = GridPathfinding.bfs(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
      expect(pathUnwalkableTarget).toEqual([]);

      // Surround (5, 5) with walls
      grid.obstacles.add("4,5");
      grid.obstacles.add("6,5");
      grid.obstacles.add("5,4");
      grid.obstacles.add("5,6");
      const pathTrapped = GridPathfinding.bfs(grid, { x: 0, y: 0 }, { x: 5, y: 5 });
      expect(pathTrapped).toEqual([]);
    });

    it("should respect includeStart option", () => {
      const pathNoStart = GridPathfinding.bfs(grid, { x: 0, y: 0 }, { x: 2, y: 0 }, { includeStart: false });
      expect(pathNoStart[0]).toEqual({ x: 1, y: 0 });
      expect(pathNoStart[pathNoStart.length - 1]).toEqual({ x: 2, y: 0 });
    });
  });

  describe("A* Pathfinding", () => {
    it("should find an optimal path on an open grid", () => {
      const path = GridPathfinding.aStar(grid, { x: 0, y: 0 }, { x: 0, y: 3 });
      expect(path).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 0, y: 3 },
      ]);
    });

    it("should account for variable tile costs", () => {
      // High cost along direct path
      grid.costs.set("1,0", 10);
      grid.costs.set("2,0", 10);

      // Path going through (0, 1) -> (1, 1) -> (2, 1) -> (3, 0) should be preferred
      const path = GridPathfinding.aStar(grid, { x: 0, y: 0 }, { x: 3, y: 0 });
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1]).toEqual({ x: 3, y: 0 });
      // Ensure high cost tile (1,0) is avoided
      const keys = path.map((p) => `${p.x},${p.y}`);
      expect(keys).not.toContain("1,0");
    });

    it("should yield identical paths across multiple runs (determinism)", () => {
      const random1 = new RandomService(12345);
      const random2 = new RandomService(12345);

      grid.obstacles.add("2,2");
      grid.obstacles.add("3,2");
      grid.obstacles.add("2,3");

      const path1 = GridPathfinding.aStar(grid, { x: 0, y: 0 }, { x: 5, y: 5 }, { random: random1 });
      const path2 = GridPathfinding.aStar(grid, { x: 0, y: 0 }, { x: 5, y: 5 }, { random: random2 });

      expect(path1).toEqual(path2);
    });
  });

  describe("Pac-Man Style getNextIntersectionTarget", () => {
    it("should find the end of a straight corridor", () => {
      // Maze grid: 5x1 corridor along y = 2 (x from 0 to 4)
      class CorridorGrid implements GridPassabilityMap {
        public width = 5;
        public height = 5;
        public isWalkable(x: number, y: number): boolean {
          return y === 2 && x >= 0 && x <= 4;
        }
      }

      const corridor = new CorridorGrid();
      // Start at (0, 2) moving Right (1, 0)
      const res = GridPathfinding.getNextIntersectionTarget(corridor, { x: 0, y: 2 }, { x: 1, y: 0 });

      expect(res.point).toEqual({ x: 4, y: 2 });
      expect(res.distance).toBe(4);
    });

    it("should stop at a T-junction", () => {
      // T-junction at (2, 2): walkable row y=2, plus column x=2 for y=0..4
      class TJunctionGrid implements GridPassabilityMap {
        public width = 5;
        public height = 5;
        public isWalkable(x: number, y: number): boolean {
          return y === 2 || x === 2;
        }
      }

      const tGrid = new TJunctionGrid();
      // Start at (0, 2) moving Right (1, 0)
      const res = GridPathfinding.getNextIntersectionTarget(tGrid, { x: 0, y: 2 }, { x: 1, y: 0 });

      expect(res.point).toEqual({ x: 2, y: 2 });
      expect(res.distance).toBe(2);
      // Available directions at junction (2, 2): Up (0, -1), Right (1, 0), Down (0, 1), Left (-1, 0)
      expect(res.availableDirections.length).toBe(4);
    });
  });
});
