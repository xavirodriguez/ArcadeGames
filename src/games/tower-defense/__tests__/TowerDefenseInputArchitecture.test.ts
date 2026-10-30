import fs from "fs";
import path from "path";

const screenSource = fs.readFileSync(
  path.resolve(__dirname, "../../../app/tower-defense/index.tsx"),
  "utf-8"
);

describe("Tower Defense screen input contract", () => {
  it("updates hover from pointer and touch movement without building", () => {
    expect(screenSource).toContain("onPointerMove={Platform.OS === \"web\" ? handleCanvasCoordinate : undefined}");
    expect(screenSource).toContain("onTouchMove={Platform.OS === \"web\" ? undefined : handleCanvasCoordinate}");

    const handlerStart = screenSource.indexOf("const handleCanvasCoordinate");
    const handlerEnd = screenSource.indexOf("const handleCanvasPress", handlerStart);
    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(handlerEnd).toBeGreaterThan(handlerStart);

    const coordinateHandler = screenSource.slice(handlerStart, handlerEnd);
    expect(coordinateHandler).toContain("cursorX:");
    expect(coordinateHandler).toContain("cursorY:");
    expect(coordinateHandler).not.toMatch(/build\s*:\s*true/);
  });

  it("confirms selection on press and keeps construction as a separate action", () => {
    expect(screenSource).toContain("const handleCanvasPress = (event: CanvasCoordinateEvent) =>");
    expect(screenSource).toContain("handleCanvasCoordinate(event, true)");
    expect(screenSource).toContain("onPress={handleCanvasPress}");
    expect(screenSource).toContain("onBuild={() =>");
    expect(screenSource).toContain("handleInput({ build: true, selectedTowerType: selectedTower })");
  });
});
