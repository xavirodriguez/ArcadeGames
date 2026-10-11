export function resolveTileColor(tile: string | undefined): string {
  if (tile === "path") return "#2a2a4a";
  if (tile === "buildable") return "#16213e";
  if (tile === "spawn") return "#3d1a1a";
  if (tile === "base") return "#1a3d1a";
  if (tile === "blocked") return "#0a0a12";
  return "#0f0f1a";
}
