import { EffectDrawer, ComponentRegistry } from "@tiny-aster/core";
import { ActiveMissionState } from "../missions/MissionTypes";
import { colors } from "../../../theme/colors";
import { Skia, getPaint } from "./SkiaContext";

/**
 * View model representing the processed data required to draw a mission HUD.
 * @public
 */
export interface MissionHudViewModel {
  statusColor: string;
  statusText: string;
  progressStr: string;
  ratio: number;
}

/**
 * Customization options for rendering the mission HUD overlay.
 * @public
 */
export interface MissionHudOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

const DEFAULT_HUD_OPTIONS: Required<MissionHudOptions> = {
  x: 20,
  y: 80,
  width: 280,
  height: 48,
};

/**
 * Pure function that resolves active mission state into HUD view model parameters.
 * @param activeMission - The active mission state retrieved from World resource.
 * @public
 */
export function resolveMissionHudModel(activeMission: ActiveMissionState): MissionHudViewModel {
  let statusColor: string = colors.cyan;
  let statusText = `🎯 ${activeMission.title.toUpperCase()}`;

  if (activeMission.completed) {
    statusColor = colors.green;
    statusText = `★ ${activeMission.title.toUpperCase()} (COMPLETADA)`;
  } else if (activeMission.failed) {
    statusColor = colors.pink;
    statusText = `✕ ${activeMission.title.toUpperCase()} (FALLIDA)`;
  }

  let progressStr = `${activeMission.currentCount} / ${activeMission.targetCount}`;
  if (activeMission.targetTimer > 0) {
    progressStr = `${activeMission.currentTimer.toFixed(1)}s / ${activeMission.targetTimer}s`;
  }

  const ratio = activeMission.targetCount > 0
    ? Math.min(1, Math.max(0, activeMission.currentCount / activeMission.targetCount))
    : activeMission.targetTimer > 0
    ? Math.min(1, Math.max(0, (activeMission.targetTimer - activeMission.currentTimer) / activeMission.targetTimer))
    : 0;

  return {
    statusColor,
    statusText,
    progressStr,
    ratio,
  };
}

/**
 * Factory creating a Canvas2D EffectDrawer for rendering active mini-mission HUDs.
 * @param options - Position and size parameters.
 * @public
 */
export function createCanvasMissionHUD<TComponents extends ComponentRegistry = ComponentRegistry>(
  options?: MissionHudOptions
): EffectDrawer<CanvasRenderingContext2D, TComponents> {
  const { x, y, width, height } = { ...DEFAULT_HUD_OPTIONS, ...options };

  return {
    draw(ctx, world) {
      const activeMission = world.getResource<ActiveMissionState>("ActiveMission");
      if (!activeMission) return;

      const model = resolveMissionHudModel(activeMission);

      ctx.save();

      ctx.fillStyle = "rgba(10, 14, 39, 0.85)";
      ctx.fillRect(x, y, width, height);

      ctx.strokeStyle = model.statusColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, width, height);

      ctx.font = "bold 12px monospace";
      ctx.fillStyle = model.statusColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.shadowColor = model.statusColor;
      ctx.shadowBlur = 6;
      ctx.fillText(model.statusText, x + 8, y + 6);

      ctx.font = "11px monospace";
      ctx.fillStyle = colors.white;
      ctx.shadowBlur = 0;
      ctx.fillText(model.progressStr, x + 8, y + 26);

      const barX = x + 130;
      const barY = y + 28;
      const barW = width - 140;
      const barH = 8;

      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(barX, barY, barW, barH);

      ctx.fillStyle = model.statusColor;
      ctx.fillRect(barX, barY, barW * model.ratio, barH);

      ctx.restore();
    },
  };
}

/**
 * Factory creating a React Native Skia EffectDrawer for rendering active mini-mission HUDs.
 * @param options - Position and size parameters.
 * @public
 */
export function createSkiaMissionHUD<TComponents extends ComponentRegistry = ComponentRegistry>(
  options?: MissionHudOptions
): EffectDrawer<any, TComponents> {
  const { x, y, width, height } = { ...DEFAULT_HUD_OPTIONS, ...options };

  return {
    draw(canvas, world) {
      if (!Skia) return;
      const activeMission = world.getResource<ActiveMissionState>("ActiveMission");
      if (!activeMission) return;

      const model = resolveMissionHudModel(activeMission);

      canvas.save();
      const paint = getPaint();
      paint.reset();
      paint.setAntiAlias(true);

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("rgba(10, 14, 39, 0.85)"));
      const rect = Skia.XYWHRect(x, y, width, height);
      canvas.drawRect(rect, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(model.statusColor));
      paint.setStrokeWidth(1.5);
      canvas.drawRect(rect, paint);

      canvas.restore();
    },
  };
}

/**
 * Default shared Canvas2D Mission HUD EffectDrawer instance.
 * @public
 */
export const drawCanvasMissionHUD: EffectDrawer<CanvasRenderingContext2D, ComponentRegistry> = createCanvasMissionHUD();

/**
 * Default shared Skia Mission HUD EffectDrawer instance.
 * @public
 */
export const drawSkiaMissionHUD: EffectDrawer<any, ComponentRegistry> = createSkiaMissionHUD();
