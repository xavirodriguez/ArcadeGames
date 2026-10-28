import { World, Renderer, CoreComponentRegistry, Entity, ShapeDrawer, EffectDrawer, ShapeType, RenderComponent, TransformComponent, ColliderComponent, SceneManager, SceneState, resolveViewportDimensions, buildRenderPlan, RenderQueueEntry } from "@tiny-aster/core";
import { CanvasCircleDrawer, CanvasBoxDrawer, CanvasPolygonDrawer } from "./CanvasShapeDrawers";
import { CanvasSpriteDrawer } from "./CanvasSpriteDrawer";

declare global {
  var __ARCADE_PERF__: boolean | undefined;
}

export interface FrameTimeStats {
  p50: number;
  p95: number;
  p99: number;
  count: number;
  lastFrameMs: number;
}

export class FrameTimeMeter {
  private readonly buffer: Float64Array;
  private pointer = 0;
  private count = 0;

  constructor(size = 300) {
    this.buffer = new Float64Array(size);
  }

  public record(durationMs: number): void {
    this.buffer[this.pointer] = durationMs;
    this.pointer = (this.pointer + 1) % this.buffer.length;
    if (this.count < this.buffer.length) {
      this.count++;
    }
  }

  public getStats(): FrameTimeStats {
    if (this.count === 0) {
      return { p50: 0, p95: 0, p99: 0, count: 0, lastFrameMs: 0 };
    }
    const samples = new Float64Array(this.count);
    for (let i = 0; i < this.count; i++) {
      samples[i] = this.buffer[i];
    }
    samples.sort();

    const getPercentile = (p: number): number => {
      const idx = Math.min(Math.floor(this.count * p), this.count - 1);
      return samples[idx];
    };

    const lastIdx = (this.pointer - 1 + this.buffer.length) % this.buffer.length;

    return {
      p50: getPercentile(0.5),
      p95: getPercentile(0.95),
      p99: getPercentile(0.99),
      count: this.count,
      lastFrameMs: this.buffer[lastIdx] ?? 0,
    };
  }

  public reset(): void {
    this.pointer = 0;
    this.count = 0;
  }
}

/**
 * Basic 2D Canvas renderer.
 */
export class CanvasRenderer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements Renderer<TRegistry, CanvasRenderingContext2D> {
  /** Reusable buffer passed to buildRenderPlan (zero-alloc path). */
  private entriesBuffer: RenderQueueEntry[] = [];
  public readonly type = "canvas";
  private readonly backgroundEffects: Map<string, EffectDrawer<CanvasRenderingContext2D, TRegistry>> = new Map();
  private readonly frameTimeMeter = new FrameTimeMeter(300);

  private lastCanvas: HTMLCanvasElement | null = null;
  private lastScreenConfig: { width: number; height: number } | null = null;
  private lastScreenWidth = -1;
  private lastScreenHeight = -1;
  private lastDpr = -1;

  private transitionSnapshotScene: unknown | null = null;
  private isTransitionSnapshotCaptured = false;
  private transitionSnapshotWidth = -1;
  private transitionSnapshotHeight = -1;

  public syncSize(canvas: HTMLCanvasElement, screenConfig?: { width: number; height: number }): void {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    if (!screenConfig) return;

    if (
      this.lastCanvas === canvas &&
      this.lastScreenWidth === screenConfig.width &&
      this.lastScreenHeight === screenConfig.height &&
      this.lastDpr === dpr
    ) {
      return;
    }

    this.lastCanvas = canvas;
    this.lastScreenConfig = screenConfig;
    this.lastScreenWidth = screenConfig.width;
    this.lastScreenHeight = screenConfig.height;
    this.lastDpr = dpr;

    const targetWidth = Math.round(screenConfig.width * dpr);
    const targetHeight = Math.round(screenConfig.height * dpr);
    if (canvas.width !== targetWidth) {
      canvas.width = targetWidth;
    }
    if (canvas.height !== targetHeight) {
      canvas.height = targetHeight;
    }
  }

  public getFrameTimeStats(): FrameTimeStats {
    return this.frameTimeMeter.getStats();
  }

  private drawPerfHud(ctx: CanvasRenderingContext2D, stats: FrameTimeStats): void {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    ctx.save();
    ctx.setTransform?.(dpr, 0, 0, dpr, 0, 0);
    ctx.font = "11px monospace";
    const text = `p50:${stats.p50.toFixed(2)}ms | p95:${stats.p95.toFixed(2)}ms | p99:${stats.p99.toFixed(2)}ms (${stats.count}f)`;
    const metrics = ctx.measureText(text);
    const bgWidth = metrics.width + 12;
    const bgHeight = 18;
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(6, 6, bgWidth, bgHeight);
    ctx.strokeStyle = "rgba(0, 255, 200, 0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, bgWidth, bgHeight);
    ctx.fillStyle = "#00ffc8";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 12, 6 + bgHeight / 2);
    ctx.restore();
  }

  constructor(
    private readonly shapeDrawers: Map<string, ShapeDrawer<CanvasRenderingContext2D, TRegistry>> = new Map()
  ) {
    // Pre-populate default shape drawers if not already present
    if (!this.shapeDrawers.has("sprite")) {
      this.shapeDrawers.set("sprite", new CanvasSpriteDrawer<TRegistry>());
    }
    if (!this.shapeDrawers.has("Circle")) {
      this.shapeDrawers.set("Circle", new CanvasCircleDrawer());
    }
    if (!this.shapeDrawers.has("circle")) {
      this.shapeDrawers.set("circle", new CanvasCircleDrawer());
    }
    if (!this.shapeDrawers.has("Box")) {
      this.shapeDrawers.set("Box", new CanvasBoxDrawer());
    }
    if (!this.shapeDrawers.has("box")) {
      this.shapeDrawers.set("box", new CanvasBoxDrawer());
    }
    if (!this.shapeDrawers.has("Polygon")) {
      this.shapeDrawers.set("Polygon", new CanvasPolygonDrawer());
    }
    if (!this.shapeDrawers.has("polygon")) {
      this.shapeDrawers.set("polygon", new CanvasPolygonDrawer());
    }
  }

  public registerShape(name: string, drawer: ShapeDrawer<CanvasRenderingContext2D, TRegistry>): void {
    this.shapeDrawers.set(name, drawer);
  }

  public registerBackgroundEffect(name: string, drawer: EffectDrawer<CanvasRenderingContext2D, TRegistry>): void {
    this.backgroundEffects.set(name, drawer);
  }

  public render(world: World<TRegistry>, ctx: CanvasRenderingContext2D): void {
    const sceneManager = world.getResource<SceneManager>("SceneManager");
    if (sceneManager) {
      const state = sceneManager.getState();
      if (state === SceneState.UNLOADING || state === SceneState.LOADING) {
        const progress = sceneManager.transitionProgress;
        const effect = sceneManager.getActiveTransitionEffect();
        let options = sceneManager.getTransitionOptions();

        const drawsBoth = effect?.drawsBothScenes === true;

        if (drawsBoth) {
          const oldScene = sceneManager.getTransitionOldScene();
          const newScene = sceneManager.getTransitionNewScene();
          if (newScene) {
            this.renderWorld(newScene.getWorld() as unknown as World<TRegistry>, ctx);
          } else {
            this.renderWorld(world, ctx);
          }
          if (oldScene) {
            // Render old scene onto offscreen canvas for the transition effect
            const canvas = ctx.canvas;
            if (canvas) {
              const off = this.getOffscreen(canvas.width, canvas.height);
              const octx = off.getContext("2d");
              if (octx) {
                if (
                  this.transitionSnapshotScene !== oldScene ||
                  !this.isTransitionSnapshotCaptured ||
                  this.transitionSnapshotWidth !== canvas.width ||
                  this.transitionSnapshotHeight !== canvas.height
                ) {
                  octx.clearRect(0, 0, off.width, off.height);
                  this.renderWorld(oldScene.getWorld() as unknown as World<TRegistry>, octx);
                  this.transitionSnapshotScene = oldScene;
                  this.isTransitionSnapshotCaptured = true;
                  this.transitionSnapshotWidth = canvas.width;
                  this.transitionSnapshotHeight = canvas.height;
                }
                if (!options) {
                  options = {};
                }
                options = { ...options, offscreenCanvas: off as unknown as CanvasImageSource };
              }
            }
          }
          if (effect) {
            effect.render(ctx, progress, options);
          }
          return;
        }

        if (progress <= 0.5) {
          const oldScene = sceneManager.getTransitionOldScene();
          if (oldScene) {
            this.renderWorld(oldScene.getWorld() as unknown as World<TRegistry>, ctx);
          } else {
            this.renderWorld(world, ctx);
          }
        } else {
          const newScene = sceneManager.getTransitionNewScene();
          if (newScene) {
            this.renderWorld(newScene.getWorld() as unknown as World<TRegistry>, ctx);
          } else {
            this.renderWorld(world, ctx);
          }
        }

        if (effect) {
          effect.render(ctx, progress, options);
        }
        return;
      } else {
        this.transitionSnapshotScene = null;
        this.isTransitionSnapshotCaptured = false;
      }
    } else {
      this.transitionSnapshotScene = null;
      this.isTransitionSnapshotCaptured = false;
    }

    this.renderWorld(world, ctx);
  }

  private _offscreenCanvas: { width: number; height: number; getContext(type: "2d"): CanvasRenderingContext2D | null } | null = null;

  private getOffscreen(width: number, height: number): { width: number; height: number; getContext(type: "2d"): CanvasRenderingContext2D | null } {
    if (typeof document === "undefined") {
      return { width, height, getContext: () => null };
    }
    if (!this._offscreenCanvas) {
      this._offscreenCanvas = document.createElement("canvas") as unknown as { width: number; height: number; getContext(type: "2d"): CanvasRenderingContext2D | null };
    }
    if (this._offscreenCanvas.width !== width || this._offscreenCanvas.height !== height) {
      this._offscreenCanvas.width = width;
      this._offscreenCanvas.height = height;
    }
    return this._offscreenCanvas;
  }

  private renderWorld(world: World<TRegistry>, ctx: CanvasRenderingContext2D): void {
    const isPerfEnabled = Boolean(
      (typeof globalThis !== "undefined" && globalThis.__ARCADE_PERF__) ||
      world.getResource("DebugPerf")
    );
    const startMs = isPerfEnabled && typeof performance !== "undefined" ? performance.now() : 0;

    const canvas = ctx.canvas;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig");
    if (canvas && screenConfig && (screenConfig !== this.lastScreenConfig || dpr !== this.lastDpr || canvas !== this.lastCanvas)) {
      this.syncSize(canvas as HTMLCanvasElement, screenConfig);
    }

    const logicalWidth = screenConfig?.width ?? (canvas.width / dpr);
    const logicalHeight = screenConfig?.height ?? (canvas.height / dpr);

    // Shared plan: query + filter + deterministic sort + camera resolution
    const plan = buildRenderPlan(world, this.entriesBuffer);
    this.entriesBuffer = plan.entries;

    const { viewportWidth, viewportHeight, entries, mainCamera } = plan;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (screenConfig && screenConfig.width > 0 && screenConfig.height > 0) {
      scale = Math.min(
        screenConfig.width / viewportWidth,
        screenConfig.height / viewportHeight
      );
      offsetX = (screenConfig.width - viewportWidth * scale) / 2;
      offsetY = (screenConfig.height - viewportHeight * scale) / 2;
    }

    ctx.setTransform?.(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.rect(0, 0, viewportWidth, viewportHeight);
    ctx.clip();

    // Draw background effects first (e.g. scrolling skies)
    for (const drawer of this.backgroundEffects.values()) {
      drawer.draw(ctx, world);
    }

    const colliderType = "Collider" as Extract<keyof TRegistry, string>;
    const visualOffsetType = "VisualOffset" as Extract<keyof TRegistry, string>;

    ctx.save(); // camera save

    let camX = 0;
    let camY = 0;
    let camZoom = 1;
    let camVoX = 0;
    let camVoY = 0;
    let hasMainCamera = false;

    if (mainCamera) {
      hasMainCamera = true;
      camX = mainCamera.x;
      camY = mainCamera.y;
      camZoom = mainCamera.zoom;
      camVoX = mainCamera.visualOffsetX;
      camVoY = mainCamera.visualOffsetY;
      ctx.translate(-camX, -camY);
      ctx.scale(camZoom, camZoom);
      if (camVoX !== 0 || camVoY !== 0) {
        ctx.translate(-camVoX, -camVoY);
      }
    }

    let lastColor = "";

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const entity = entry.entity;
      const render = entry.render;
      const transform = entry.transform;

      ctx.save();

      if (hasMainCamera && render.ignoreCamera) {
        if (camVoX !== 0 || camVoY !== 0) {
          ctx.translate(camVoX, camVoY);
        }
        if (camZoom !== 0 && camZoom !== 1) {
          ctx.scale(1 / camZoom, 1 / camZoom);
        }
        ctx.translate(camX, camY);
      }

      const visualOffset = world.getComponent(entity, visualOffsetType) as unknown as { offsetX: number; offsetY: number; scaleX?: number; scaleY?: number } | undefined;
      const voX = visualOffset?.offsetX ?? 0;
      const voY = visualOffset?.offsetY ?? 0;
      const visualScaleX = visualOffset?.scaleX ?? 1;
      const visualScaleY = visualOffset?.scaleY ?? 1;

      const x = transform.worldX ?? transform.x;
      const y = transform.worldY ?? transform.y;
      const rotation = (transform.worldRotation ?? transform.rotation ?? 0) + (render.rotation ?? 0);
      const scaleX = transform.worldScaleX ?? transform.scaleX ?? 1;
      const scaleY = transform.worldScaleY ?? transform.scaleY ?? 1;

      ctx.translate(x + voX, y + voY);
      ctx.rotate(rotation);
      ctx.scale(scaleX * visualScaleX, scaleY * visualScaleY);
      ctx.globalAlpha = render.opacity;

      const drawColor = render.color || "white";
      if (drawColor !== lastColor) {
        ctx.fillStyle = drawColor;
        ctx.strokeStyle = drawColor;
        lastColor = drawColor;
      }

      // 1. Try custom registered shape drawer
      const customDrawer = render.shape ? this.shapeDrawers.get(render.shape) : undefined;
      if (customDrawer) {
        customDrawer.draw(ctx, world, entity);
      } else {
        // 2. Try default collider shape drawer
        const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;
        if (collider && collider.enabled) {
          const shapeTypeStr = ShapeType[collider.shape.type];
          const drawer = this.shapeDrawers.get(shapeTypeStr);
          if (drawer) {
            drawer.draw(ctx, world, entity);
          }
        } else {
          // 3. Draw fallback circle
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    ctx.restore(); // camera restore
    ctx.restore(); // viewport (letterboxing) restore

    if (isPerfEnabled && typeof performance !== "undefined") {
      const durationMs = performance.now() - startMs;
      this.frameTimeMeter.record(durationMs);
      this.drawPerfHud(ctx, this.frameTimeMeter.getStats());
    }
  }
}
