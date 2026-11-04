const SIMULATION_DIRECTORY_NAMES = new Set(["systems", "simulation"]);
const FACTORY_AND_BLUEPRINT_DIRECTORY_NAMES = new Set([
  "factory",
  "factories",
  "blueprint",
  "blueprints",
  "entities"
]);
const TEST_AND_MOCK_DIRECTORY_NAMES = new Set([
  "__tests__",
  "tests",
  "__mocks__",
  "mocks"
]);

function normalizePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function pathSegments(relativePath: string): string[] {
  return normalizePath(relativePath)
    .split("/")
    .filter(Boolean);
}

export function isTestOrMockSource(relativePath: string): boolean {
  const normalized = normalizePath(relativePath);
  const segments = pathSegments(normalized).map(segment => segment.toLowerCase());

  return (
    segments.some(segment => TEST_AND_MOCK_DIRECTORY_NAMES.has(segment)) ||
    /\.(?:test|spec)\.tsx?$/i.test(normalized)
  );
}

export function isStructuralMutationSensitiveSource(relativePath: string): boolean {
  if (isTestOrMockSource(relativePath)) return false;

  const directories = pathSegments(relativePath).slice(0, -1).map(segment => segment.toLowerCase());
  return directories.some(segment => SIMULATION_DIRECTORY_NAMES.has(segment));
}

export function isDeterminismSensitiveSource(relativePath: string): boolean {
  if (isTestOrMockSource(relativePath)) return false;

  const normalized = normalizePath(relativePath);
  const segments = pathSegments(normalized);
  const directories = segments.slice(0, -1).map(segment => segment.toLowerCase());
  const fileName = segments[segments.length - 1] ?? "";

  if (normalized.startsWith("packages/gameplay-kit/src/")) return true;

  return (
    directories.some(segment =>
      SIMULATION_DIRECTORY_NAMES.has(segment) ||
      FACTORY_AND_BLUEPRINT_DIRECTORY_NAMES.has(segment)
    ) ||
    /factory|blueprint/i.test(fileName)
  );
}

export function isVisualRandomnessSensitiveSource(relativePath: string): boolean {
  if (isTestOrMockSource(relativePath)) return false;

  const normalized = normalizePath(relativePath);
  if (!normalized.startsWith("src/games/")) return false;

  const directories = pathSegments(normalized).slice(0, -1).map(segment => segment.toLowerCase());
  return directories.some(segment => segment === "rendering" || segment === "presentation");
}
