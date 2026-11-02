import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { SpriteSheetDefinition } from "@tiny-aster/core";
import {
  parseAsepriteJson,
  type AsepriteJsonData
} from "./parsers/AsepriteJsonParser";
import {
  AsepriteExportSchema,
  SpriteEventsOverlaySchema,
  SpriteSourceConfigSchema,
  type SpriteEventsOverlay,
  type SpriteSourceConfig
} from "./SpriteSourceSchemas";
import {
  readPngDimensions,
  validateSpriteSheetDefinition
} from "../../src/games/shared/sprites/SpriteManifestValidator";

const DEFAULT_SOURCE_ROOT = "assets/sprites/sources";
const DEFAULT_ASSET_OUTPUT_ROOT = "assets/sprites/generated";
const DEFAULT_DEFINITION_OUTPUT_ROOT = "src/games/shared/sprites/generated";
const GENERATED_INDEX_PATH = DEFAULT_DEFINITION_OUTPUT_ROOT + "/index.generated.ts";

export interface SpriteBuildArtifact {
  path: string;
  content: string | Buffer;
}

export interface SpriteBuildSheetSummary {
  id: string;
  category: string;
  sourceMode: "frames" | "full-image";
  animationNames: string[];
  assetPath: string;
  definitionPath: string;
}

export interface SpriteBuildResult {
  artifacts: SpriteBuildArtifact[];
  sheets: SpriteBuildSheetSummary[];
  selectedSheetId?: string;
  stalePaths: string[];
}

export interface SpritePipelineOptions {
  repositoryRoot: string;
  sourceRoot?: string;
  assetOutputRoot?: string;
  definitionOutputRoot?: string;
  sheetId?: string;
}

interface DiscoveredSpriteSource {
  category: string;
  directoryName: string;
  config: SpriteSourceConfig;
  mode: "aseprite" | "full-image";
  jsonPath?: string;
  pngPath: string;
  eventsPath?: string;
}

interface BuiltSpriteSheet {
  definition: SpriteSheetDefinition;
  summary: SpriteBuildSheetSummary;
  artifacts: SpriteBuildArtifact[];
}

function lexicalCompare(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function resolveRepositoryPath(repositoryRoot: string, relativePath: string): string {
  const absolutePath = path.resolve(repositoryRoot, relativePath);
  const relative = path.relative(repositoryRoot, absolutePath);
  if (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Sprite pipeline path escapes repository root: " + relativePath);
  }
  return absolutePath;
}

function readJsonFile(filePath: string): unknown {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error("Unable to parse JSON file " + filePath + ": " + detail);
  }
}

function parseWithSchema<T>(
  schema: z.ZodType<T>,
  value: unknown,
  filePath: string
): T {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  const details = result.error.issues.map((issue) => {
    const location = issue.path.length > 0 ? issue.path.join(".") + ": " : "";
    return location + issue.message;
  }).join("; ");

  throw new Error("Invalid sprite source " + filePath + ": " + details);
}

function isRegularFile(filePath: string): boolean {
  try {
    return fs.lstatSync(filePath).isFile();
  } catch {
    return false;
  }
}

function listDirectories(directoryPath: string): string[] {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs.readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(lexicalCompare);
}

function discoverSpriteSources(
  repositoryRoot: string,
  sourceRoot: string
): DiscoveredSpriteSource[] {
  const absoluteSourceRoot = resolveRepositoryPath(repositoryRoot, sourceRoot);
  const discovered: DiscoveredSpriteSource[] = [];

  for (const category of listDirectories(absoluteSourceRoot)) {
    if (!/^[a-z][a-z0-9_]*$/.test(category)) {
      throw new Error("Invalid sprite source category directory: " + category);
    }

    const categoryPath = path.join(absoluteSourceRoot, category);
    for (const directoryName of listDirectories(categoryPath)) {
      if (!/^[a-z][a-z0-9_]*$/.test(directoryName)) {
        throw new Error("Invalid sprite source directory name: " + category + "/" + directoryName);
      }

      const directoryPath = path.join(categoryPath, directoryName);
      const configPath = path.join(directoryPath, "config.json");
      const jsonPath = path.join(directoryPath, "sheet.json");
      const sheetPngPath = path.join(directoryPath, "sheet.png");
      const imagePngPath = path.join(directoryPath, "image.png");

      const hasAsepriteJson = isRegularFile(jsonPath);
      const hasSheetPng = isRegularFile(sheetPngPath);
      const hasStaticImage = isRegularFile(imagePngPath);

      if (!isRegularFile(configPath)) {
        if (hasAsepriteJson || hasSheetPng || hasStaticImage) {
          throw new Error(
            "Sprite source " + category + "/" + directoryName +
            " contains image data but has no config.json."
          );
        }
        continue;
      }

      const config = parseWithSchema(
        SpriteSourceConfigSchema,
        readJsonFile(configPath),
        configPath
      );

      if (config.id !== directoryName) {
        throw new Error(
          "Sprite source directory \"" + directoryName +
          "\" must match config id \"" + config.id + "\"."
        );
      }

      if (hasAsepriteJson || hasSheetPng) {
        if (!hasAsepriteJson || !hasSheetPng || hasStaticImage) {
          throw new Error(
            "Aseprite source " + category + "/" + directoryName +
            " requires exactly sheet.json + sheet.png; image.png is not allowed."
          );
        }
        if (config.sourceMode === "full-image") {
          throw new Error("Aseprite source " + config.id + " must use sourceMode \"frames\".");
        }

        discovered.push({
          category,
          directoryName,
          config,
          mode: "aseprite",
          jsonPath,
          pngPath: sheetPngPath,
          eventsPath: path.join(directoryPath, "events.json")
        });
        continue;
      }

      if (hasStaticImage) {
        if (config.sourceMode !== "full-image") {
          throw new Error(
            "Static sprite source " + config.id +
            " must declare sourceMode \"full-image\" in config.json."
          );
        }

        discovered.push({
          category,
          directoryName,
          config,
          mode: "full-image",
          pngPath: imagePngPath
        });
        continue;
      }

      throw new Error(
        "Sprite source " + category + "/" + directoryName +
        " has config.json but neither sheet.json + sheet.png nor image.png."
      );
    }
  }

  const ids = new Set<string>();
  for (const source of discovered) {
    if (ids.has(source.config.id)) {
      throw new Error("Duplicate sprite sheet id: " + source.config.id);
    }
    ids.add(source.config.id);
  }

  return discovered;
}

function getEventsOverlay(source: DiscoveredSpriteSource): SpriteEventsOverlay | undefined {
  if (!source.eventsPath || !isRegularFile(source.eventsPath)) {
    return undefined;
  }

  return parseWithSchema(
    SpriteEventsOverlaySchema,
    readJsonFile(source.eventsPath),
    source.eventsPath
  );
}

function createDefinitionCode(
  definition: SpriteSheetDefinition,
  definitionPath: string
): string {
  const assetRequirePath = path.posix.relative(
    path.posix.dirname(definitionPath),
    definition.assetPath
  );
  const normalizedRequirePath = assetRequirePath.startsWith(".")
    ? assetRequirePath
    : "./" + assetRequirePath;

  const serializable = {
    id: definition.id,
    assetPath: definition.assetPath,
    imageSource: "__SPRITE_IMAGE_REQUIRE__",
    frameWidth: definition.frameWidth,
    frameHeight: definition.frameHeight,
    sourceMode: definition.sourceMode,
    anchor: definition.anchor,
    animations: definition.animations
  };

  const serialized = JSON.stringify(serializable, null, 2)
    .replace(
      "\"__SPRITE_IMAGE_REQUIRE__\"",
      "require(" + JSON.stringify(normalizedRequirePath) + ")"
    );

  return [
    "// GENERATED FILE - DO NOT EDIT DIRECTLY.",
    "// Regenerate with: pnpm run sprites:build -- --sheet=" + definition.id,
    "import type { SpriteSheetDefinition } from \"@tiny-aster/core\";",
    "",
    "export const " + definition.id.toUpperCase() + "_SPRITE_SHEET: SpriteSheetDefinition = " + serialized + ";",
    ""
  ].join("\n");
}

function createGeneratedIndex(sheets: readonly SpriteBuildSheetSummary[]): string {
  const sorted = [...sheets].sort((left, right) => lexicalCompare(left.id, right.id));
  const lines = [
    "// GENERATED FILE - DO NOT EDIT DIRECTLY.",
    "// Regenerate with: pnpm run sprites:build",
    "import type { SpriteSheetDefinition } from \"@tiny-aster/core\";"
  ];

  for (const sheet of sorted) {
    lines.push(
      "import { " + sheet.id.toUpperCase() + "_SPRITE_SHEET } from \"./" + sheet.id + ".generated\";"
    );
  }

  lines.push("");
  if (sorted.length > 0) {
    lines.push(
      "export { " +
      sorted.map((sheet) => sheet.id.toUpperCase() + "_SPRITE_SHEET").join(", ") +
      " };"
    );
  }
  lines.push(
    "export const GENERATED_SPRITE_SHEETS: readonly SpriteSheetDefinition[] = [" +
    sorted.map((sheet) => sheet.id.toUpperCase() + "_SPRITE_SHEET").join(", ") +
    "];"
  );
  lines.push("");

  return lines.join("\n");
}

function buildOneSpriteSheet(
  source: DiscoveredSpriteSource,
  assetOutputRoot: string,
  definitionOutputRoot: string
): BuiltSpriteSheet {
  const pngBytes = fs.readFileSync(source.pngPath);
  const pngDimensions = readPngDimensions(pngBytes);

  if (!pngDimensions) {
    throw new Error(
      "Sprite source " + source.config.id +
      " is not a PNG with a valid signature and IHDR dimensions: " + source.pngPath
    );
  }

  const assetPath = path.posix.join(
    assetOutputRoot,
    source.category,
    source.config.id + ".atlas.png"
  );
  const definitionPath = path.posix.join(
    definitionOutputRoot,
    source.config.id + ".generated.ts"
  );

  let animations: SpriteSheetDefinition["animations"];
  let sourceMode: "frames" | "full-image";

  if (source.mode === "aseprite") {
    if (!source.jsonPath) {
      throw new Error("Internal error: Aseprite source has no JSON path for " + source.config.id + ".");
    }

    const asepriteData = parseWithSchema(
      AsepriteExportSchema,
      readJsonFile(source.jsonPath),
      source.jsonPath
    );

    const metadataSize = asepriteData.meta.size;
    if (
      !metadataSize ||
      metadataSize.w !== pngDimensions.width ||
      metadataSize.h !== pngDimensions.height
    ) {
      throw new Error(
        "Aseprite metadata size for " + source.config.id +
        " does not match its PNG: JSON " +
        (metadataSize ? metadataSize.w + "x" + metadataSize.h : "<missing>") +
        ", PNG " + pngDimensions.width + "x" + pngDimensions.height + "."
      );
    }

    const events = getEventsOverlay(source);
    const parsed = parseAsepriteJson(
      asepriteData as AsepriteJsonData,
      {
        frameWidth: source.config.frameWidth,
        frameHeight: source.config.frameHeight,
        anchor: source.config.anchor,
        defaultLoop: source.config.defaultLoop,
        animationOverrides: source.config.animations,
        eventsOverlay: events?.animations
      }
    );

    animations = parsed.animations;
    sourceMode = "frames";
  } else {
    animations = {
      idle: {
        name: "idle",
        frames: [],
        frameDuration: 1,
        loop: true
      }
    };
    sourceMode = "full-image";
  }

  const definition: SpriteSheetDefinition = {
    id: source.config.id,
    assetPath,
    // Build-time validation uses this non-null placeholder; generated code emits a Metro require().
    imageSource: assetPath,
    frameWidth: source.config.frameWidth,
    frameHeight: source.config.frameHeight,
    sourceMode,
    anchor: source.config.anchor ?? { x: 0.5, y: 1 },
    animations
  };

  const issues = validateSpriteSheetDefinition(definition, pngDimensions);
  if (issues.length > 0) {
    throw new Error(
      "Generated definition for " + source.config.id + " is invalid: " +
      issues.map((issue) => "[" + issue.code + "] " + issue.message).join("; ")
    );
  }

  const summary: SpriteBuildSheetSummary = {
    id: source.config.id,
    category: source.category,
    sourceMode,
    animationNames: Object.keys(animations).sort(lexicalCompare),
    assetPath,
    definitionPath
  };

  return {
    definition,
    summary,
    artifacts: [
      { path: assetPath, content: pngBytes },
      { path: definitionPath, content: createDefinitionCode(definition, definitionPath) }
    ]
  };
}

function listGeneratedFiles(repositoryRoot: string, relativeRoot: string, extension: string): string[] {
  const absoluteRoot = resolveRepositoryPath(repositoryRoot, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) {
    return [];
  }

  const files: string[] = [];
  const visit = (directoryPath: string): void => {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
      const absolutePath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(path.relative(repositoryRoot, absolutePath).split(path.sep).join("/"));
      }
    }
  };

  visit(absoluteRoot);
  return files.sort(lexicalCompare);
}

export function generateSpriteArtifacts(options: SpritePipelineOptions): SpriteBuildResult {
  const repositoryRoot = path.resolve(options.repositoryRoot);
  const sourceRoot = options.sourceRoot ?? DEFAULT_SOURCE_ROOT;
  const assetOutputRoot = options.assetOutputRoot ?? DEFAULT_ASSET_OUTPUT_ROOT;
  const definitionOutputRoot = options.definitionOutputRoot ?? DEFAULT_DEFINITION_OUTPUT_ROOT;

  const sources = discoverSpriteSources(repositoryRoot, sourceRoot);
  if (options.sheetId && !sources.some((source) => source.config.id === options.sheetId)) {
    throw new Error("Unknown sprite sheet id: " + options.sheetId);
  }

  const builtSheets = sources.map((source) =>
    buildOneSpriteSheet(source, assetOutputRoot, definitionOutputRoot)
  );

  const allArtifacts = builtSheets.flatMap((sheet) => sheet.artifacts);
  const summaries = builtSheets.map((sheet) => sheet.summary);
  const indexPath = path.posix.join(definitionOutputRoot, "index.generated.ts");
  allArtifacts.push({
    path: indexPath,
    content: createGeneratedIndex(summaries)
  });

  const selectedSummary = summaries.find((sheet) => sheet.id === options.sheetId);
  const selectedArtifacts = options.sheetId
    ? allArtifacts.filter((artifact) =>
        artifact.path === indexPath ||
        artifact.path === selectedSummary?.assetPath ||
        artifact.path === selectedSummary?.definitionPath
      )
    : allArtifacts;

  const stalePaths = options.sheetId
    ? []
    : [
        ...listGeneratedFiles(repositoryRoot, assetOutputRoot, ".atlas.png"),
        ...listGeneratedFiles(repositoryRoot, definitionOutputRoot, ".generated.ts")
      ].filter((filePath) => !allArtifacts.some((artifact) => artifact.path === filePath));

  return {
    artifacts: selectedArtifacts,
    sheets: summaries,
    selectedSheetId: options.sheetId,
    stalePaths: [...new Set(stalePaths)].sort(lexicalCompare)
  };
}

function artifactContentsEqual(expected: string | Buffer, actual: Buffer): boolean {
  if (typeof expected === "string") {
    return actual.toString("utf8") === expected;
  }
  return expected.equals(actual);
}

export function checkSpriteArtifacts(
  repositoryRoot: string,
  result: SpriteBuildResult
): string[] {
  const issues: string[] = [];

  for (const artifact of result.artifacts) {
    const absolutePath = resolveRepositoryPath(repositoryRoot, artifact.path);
    if (!fs.existsSync(absolutePath)) {
      issues.push("Missing generated artifact: " + artifact.path);
      continue;
    }

    const actual = fs.readFileSync(absolutePath);
    if (!artifactContentsEqual(artifact.content, actual)) {
      issues.push("Generated artifact is out of date: " + artifact.path);
    }
  }

  for (const stalePath of result.stalePaths) {
    issues.push("Stale generated artifact should be removed: " + stalePath);
  }

  return issues;
}

export function writeSpriteArtifacts(
  repositoryRoot: string,
  result: SpriteBuildResult
): void {
  for (const artifact of result.artifacts) {
    const absolutePath = resolveRepositoryPath(repositoryRoot, artifact.path);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    if (typeof artifact.content === "string") {
      fs.writeFileSync(absolutePath, artifact.content, "utf8");
    } else {
      fs.writeFileSync(absolutePath, artifact.content);
    }
  }

  if (result.selectedSheetId) {
    return;
  }

  for (const stalePath of result.stalePaths) {
    const absolutePath = resolveRepositoryPath(repositoryRoot, stalePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }
}
