import { World, EffectDrawer } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { ActiveMissionState } from "../../shared/missions/MissionTypes";
import { colors } from "../../../theme/colors";

/**
 * Renders the active mini-mission HUD overlay for Canvas2D renderer.
 * @public
 */
export const drawAsteroidsMissionHUD: EffectDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world) {
    const activeMission = world.getResource<ActiveMissionState>("ActiveMission");
    if (!activeMission) return;

    ctx.save();
    const x = 20;
    const y = 80;
    const width = 280;
    const height = 48;

    ctx.fillStyle = "rgba(10, 14, 39, 0.85)";
    ctx.fillRect(x, y, width, height);

    let statusColor: string = colors.cyan;
    let statusText = `🎯 ${activeMission.title.toUpperCase()}`;

    if (activeMission.completed) {
      statusColor = colors.green;
      statusText = `★ ${activeMission.title.toUpperCase()} (COMPLETADA)`;
    } else if (activeMission.failed) {
      statusColor = colors.pink;
      statusText = `✕ ${activeMission.title.toUpperCase()} (FALLIDA)`;
    }

    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, width, height);

    ctx.font = "bold 12px monospace";
    ctx.fillStyle = statusColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.shadowColor = statusColor;
    ctx.shadowBlur = 6;
    ctx.fillText(statusText, x + 8, y + 6);

    ctx.font = "11px monospace";
    ctx.fillStyle = colors.white;
    ctx.shadowBlur = 0;

    let progressStr = `${activeMission.currentCount} / ${activeMission.targetCount}`;
    if (activeMission.targetTimer > 0) {
      progressStr = `${activeMission.currentTimer.toFixed(1)}s / ${activeMission.targetTimer}s`;
    }
    ctx.fillText(progressStr, x + 8, y + 26);

    const barX = x + 130;
    const barY = y + 28;
    const barW = width - 140;
    const barH = 8;
    const ratio = activeMission.targetCount > 0
      ? Math.min(1, Math.max(0, activeMission.currentCount / activeMission.targetCount))
      : activeMission.targetTimer > 0
      ? Math.min(1, Math.max(0, (activeMission.targetTimer - activeMission.currentTimer) / activeMission.targetTimer))
      : 0;

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = statusColor;
    ctx.fillRect(barX, barY, barW * ratio, barH);

    ctx.restore();
  }
};
