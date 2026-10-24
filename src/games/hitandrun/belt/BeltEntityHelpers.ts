export function createBeltTransformComponent(x: number, y: number) {
  return {
    type: "Transform",
    x,
    y,
    worldX: x,
    worldY: y,
    rotation: 0,
    worldRotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: true
  } as const;
}

export function createBeltElevationComponent(z: number = 0) {
  return {
    type: "BeltElevation",
    z,
    vz: 0,
    grounded: true
  } as const;
}
