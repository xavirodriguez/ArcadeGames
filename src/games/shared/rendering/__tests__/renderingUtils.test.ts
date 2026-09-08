import { World } from "@tiny-aster/core";
import {
  ensureSkiaAvailable,
  getRenderGuard,
  getDrawableTransform,
  getDrawable
} from "../renderingUtils";

describe("renderingUtils", () => {
  describe("ensureSkiaAvailable", () => {
    it("should return a boolean indicating whether Skia is loaded", () => {
      const isAvailable = ensureSkiaAvailable();
      expect(typeof isAvailable).toBe("boolean");
    });
  });

  describe("getRenderGuard", () => {
    it("should return null if render component does not exist", () => {
      const world = new World();
      const entity = world.createEntity();
      expect(getRenderGuard(world, entity)).toBeNull();
    });

    it("should return null if render component visible is false", () => {
      const world = new World();
      const entity = world.createEntity();
      world.addComponent(entity, {
        type: "Render",
        visible: false,
        opacity: 1,
        order: 0,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      });
      expect(getRenderGuard(world, entity)).toBeNull();
    });

    it("should return RenderComponent if visible is true", () => {
      const world = new World();
      const entity = world.createEntity();
      const renderComp: import("@tiny-aster/core").RenderComponent = {
        type: "Render",
        visible: true,
        opacity: 1,
        order: 0,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0,
        color: "#ff0000",
        size: 20
      };
      world.addComponent(entity, renderComp);
      expect(getRenderGuard(world, entity)).toEqual(renderComp);
    });
  });

  describe("getDrawableTransform", () => {
    it("should return null if transform component does not exist", () => {
      const world = new World();
      const entity = world.createEntity();
      expect(getDrawableTransform(world, entity)).toBeNull();
    });

    it("should return TransformComponent if present", () => {
      const world = new World();
      const entity = world.createEntity();
      const transformComp: import("@tiny-aster/core").TransformComponent = {
        type: "Transform",
        x: 10,
        y: 20,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 10,
        worldY: 20,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      };
      world.addComponent(entity, transformComp);
      expect(getDrawableTransform(world, entity)).toEqual(transformComp);
    });
  });

  describe("getDrawable", () => {
    it("should return fallback size and color when not provided on RenderComponent", () => {
      const world = new World();
      const entity = world.createEntity();
      const renderComp: import("@tiny-aster/core").RenderComponent = {
        type: "Render",
        visible: true,
        opacity: 1,
        order: 0,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      };
      world.addComponent(entity, renderComp);

      const drawable = getDrawable(world, entity, 15, "#00ff00");
      expect(drawable).not.toBeNull();
      expect(drawable?.size).toBe(15);
      expect(drawable?.color).toBe("#00ff00");
    });
  });
});
