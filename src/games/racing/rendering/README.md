# Racing Skin System & Rendering Contracts

The Racing game ("Micro Racers" / "Miniature Tabletop Rally") utilizes a data-driven **Skin System** that completely decouples visual aesthetics, color palettes, object shapes, and UI themes from core physics, collision detection, and track logic.

---

## 1. Anatomy of a `RacingSkin`

A skin is a data-driven configuration object defined by the `RacingSkin` interface in `src/games/racing/rendering/RacingSkin.ts`:

```ts
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
```

### Properties Breakdown:
- **`id`**: Unique string key identifying the skin (e.g., `"breakfast"`, `"billiard"`, `"desk"`, `"garden"`, `"space"`).
- **`palette`**: 15 semantic color tokens (`surface`, `surfaceDetail`, `track`, `trackEdge`, `player`, `playerHighlight`, `rival`, `rivalHighlight`, `obstacle`, `obstacleHighlight`, `danger`, `shadow`, `accent`, `outline`, `text`).
- **`surfacePattern`**: Background pattern algorithm (`"wood"` curve grain, `"diagonal"` billiard grid, `"starfield"` cosmic dots, or `"none"`).
- **`obstacleDrawers`**: Mapping from obstacle `kind` (e.g. `"bowl"`, `"mug"`, `"billiard_ball"`, `"asteroid"`) to a `DrawerSpec`.
- **`zoneDrawers`**: Mapping from surface name (e.g. `"water"`, `"oil"`, `"deadly_edge"`, `"lava"`) to a `DrawerSpec`.
- **`wallDrawer`**: Drawer function for perimeter and track walls.
- **`actorDrawer`**: Drawer function for vehicles/spaceships (replaces hardcoded car shapes).
- **`finishCheckers`**: Pair of checkerboard colors `[color1, color2]` for the finish line.
- **`ui`**: Theme colors (`glowColor`, `accentColor`) for the HUD and start screen.

---

## 2. Drawer Spec Contract & Declarative Mini-DSL

Drawers do not call Canvas2D or Skia APIs directly. Instead, they are pure functions returning an array of declarative `RenderPrimitive`s:

```ts
export type DrawerSpec<TParams> = (params: TParams) => RenderPrimitive[];
```

### `RenderPrimitive` Discriminated Union:
- **`rect`**: `{ type: "rect", x, y, w, h, fill?, stroke?, strokeWidth?, alpha? }`
- **`roundRect`**: `{ type: "roundRect", x, y, w, h, r, fill?, stroke?, strokeWidth?, alpha? }`
- **`circle`**: `{ type: "circle", cx, cy, r, fill?, stroke?, strokeWidth?, alpha? }`
- **`ellipse`**: `{ type: "ellipse", cx, cy, rx, ry, rotation?, fill?, stroke?, strokeWidth?, alpha? }`
- **`arc`**: `{ type: "arc", cx, cy, r, startAngle, endAngle, fill?, stroke?, strokeWidth?, alpha? }`
- **`line`**: `{ type: "line", x1, y1, x2, y2, stroke, strokeWidth?, alpha?, lineCap? }`
- **`path`**: `{ type: "path", points: Array<{x, y}>, closed?, fill?, stroke?, strokeWidth?, alpha? }`
- **`text`**: `{ type: "text", x, y, text, fontSize, fill, align?, baseline?, alpha? }`
- **`group`**: `{ type: "group", x?, y?, rotation?, scaleX?, scaleY?, alpha?, children: RenderPrimitive[] }`

Engine interpreters (`interpretCanvas` in Canvas2D and `interpretSkia` in Skia) translate these primitives to native backend calls without code duplication.

---

## 3. Registering a New Skin

To create and register a new skin (e.g. `"space"`):

1. Define the skin object in `src/games/racing/rendering/RacingSkin.ts` (or import it):

```ts
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
    asteroid: asteroidObstacleDrawer
  },
  zoneDrawers: {
    lava: lavaZoneDrawer
  },
  wallDrawer: spaceWallDrawer,
  actorDrawer: spaceshipActorDrawer,
  finishCheckers: ["#00f0ff", "#ff007f"],
  ui: { glowColor: "#00f0ff", accentColor: "#ff007f" }
};
```

2. Add it to `SKIN_REGISTRY`:

```ts
export const SKIN_REGISTRY: Record<string, RacingSkin> = {
  breakfast: breakfastSkin,
  billiard: billiardSkin,
  desk: deskSkin,
  garden: gardenSkin,
  space: spaceSkin,
  tabletop: breakfastSkin
};
```

---

## 4. Creating a Level JSON for a New Theme

To create a new level for a new skin, simply write a track JSON file in `src/games/racing/config/tracks/my_level.json` declaring `"skin": "<skin_id>"`:

```json
{
  "id": "space_demo",
  "name": "Cosmic Nebula Grand Prix",
  "skin": "space",
  "width": 1600,
  "height": 1000,
  "spawnPoints": [
    { "x": 800, "y": 200, "rotation": 0 },
    { "x": 800, "y": 230, "rotation": 0 }
  ],
  "waypoints": [
    { "x": 800, "y": 200, "radius": 70 },
    { "x": 1300, "y": 300, "radius": 70 }
  ],
  "walls": [
    { "x": 800, "y": 30, "width": 1540, "height": 24 }
  ],
  "zones": [
    {
      "id": "lava_zone_1",
      "x": 1200,
      "y": 500,
      "width": 160,
      "height": 160,
      "surface": "lava",
      "gripModifier": 0.3,
      "speedModifier": 0.8
    }
  ],
  "obstacles": [
    { "id": "asteroid_1", "x": 800, "y": 520, "radius": 40, "kind": "asteroid" }
  ]
}
```

No engine modifications, physics system edits, or Canvas/Skia backend changes are required.
