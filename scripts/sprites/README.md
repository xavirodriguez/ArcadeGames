# Sprite asset pipeline

The sprite generator is a build-time tool. Runtime code consumes only generated
PNG files and typed SpriteSheetDefinition modules.

## Supported source layouts

### Animated Aseprite sheet

Place one sheet in assets/sprites/sources/<category>/<id>/:

~~~text
sheet.json
sheet.png
config.json
events.json        # optional
~~~

Export Aseprite JSON in either Array or Hash mode. Keep trimming and rotation
disabled. The JSON metadata size must match the PNG dimensions.

Example config.json:

~~~json
{
  "id": "oni_red",
  "frameWidth": 56,
  "frameHeight": 90,
  "anchor": { "x": 0.5, "y": 1 },
  "animations": {
    "idle": { "loop": true },
    "walk": { "loop": true },
    "attack": { "loop": false },
    "hurt": { "loop": false },
    "death": { "loop": false }
  }
}
~~~

The id must equal the source directory name. Logical dimensions and the shared
anchor are explicit configuration, not inferred from the first source frame.

Example events.json:

~~~json
{
  "animations": {
    "attack": [
      {
        "frame": 3,
        "type": "hit",
        "payload": { "damageWindow": true }
      },
      {
        "frame": 4,
        "type": "sfx",
        "payload": { "cue": "sword_slash" }
      }
    ]
  }
}
~~~

Event indices are zero-based and refer to the final playback sequence after
Aseprite direction normalization.

### Static full-image prop

Place the source in assets/sprites/sources/<category>/<id>/:

~~~text
image.png
config.json
~~~

Example config.json:

~~~json
{
  "id": "tower_basic_art",
  "frameWidth": 34,
  "frameHeight": 34,
  "sourceMode": "full-image",
  "anchor": { "x": 0.5, "y": 0.5 }
}
~~~

The generator supplies one canonical idle clip with no frame rectangles,
matching the existing full-image renderer contract.

## Commands

~~~bash
# Build all source sheets
pnpm run sprites:build

# Build one sheet (also refreshes the generated index)
pnpm run sprites:build -- --sheet=oni_red

# Validate and print planned outputs without writing
pnpm run sprites:build -- --dry-run

# Print per-sheet details
pnpm run sprites:build -- --verbose

# Verify committed PNG and TypeScript artifacts without modifying the workspace
pnpm run sprites:build -- --check

# Validate the complete runtime catalogue
pnpm run sprites:validate
~~~

The check command compares PNG bytes and generated TypeScript content. It
also detects stale generated files. It never writes or deletes files.
A normal full build removes stale .atlas.png and .generated.ts files from the
dedicated generated output directories. A sheet-specific build does not prune
unrelated generated files.

## Generated output

For each source sheet:

~~~text
assets/sprites/generated/<category>/<id>.atlas.png
src/games/shared/sprites/generated/<id>.generated.ts
~~~

The pipeline also writes index.generated.ts. It statically imports each
definition and exports GENERATED_SPRITE_SHEETS. The shared SpriteRegistry
combines this generated collection with the remaining hand-authored sheets.

Generated TypeScript contains a literal Metro require() to the PNG. Do not
replace it with a dynamically assembled path or edit generated files by hand.

## Validation rules

- IDs, category names and source directory names use lowercase snake_case.
- Aseprite Array and Hash frame collections are accepted.
- Hash frames use deterministic natural ordering.
- Frame rectangles must be integral, positive and inside the PNG bounds.
- The JSON metadata dimensions must match the exported PNG.
- Frame durations must be positive and uniform within each animation.
  Variable durations fail; they are never averaged.
- forward, reverse and pingpong directions are supported.
- Finite repeat counts, rotated frames and trimmed frames are not supported.
- Anchors are normalized values in [0, 1].
- Event overlays must reference existing clips and valid playback frame indices.
- The generator copies source PNG bytes as-is; it does not repack, trim or recompress.

## Artist / developer workflow

1. Edit the Aseprite animation or static PNG.
2. Export the JSON and PNG into the source folder.
3. Update config.json for logical dimensions, anchor and loop overrides.
4. Update events.json when the animation needs semantic frame events.
5. Run pnpm run sprites:build -- --sheet=<id>.
6. Review the PNG diff and generated TypeScript diff.
7. Run pnpm run sprites:validate and the focused sprite tests.
8. Commit source files and generated artifacts together.

No manual frame rectangles or generated catalogue imports are required. Keep
game state-selection systems and event semantics in the game/runtime code.
