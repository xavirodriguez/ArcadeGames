import { World, EffectDrawer } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { MissionProgress } from "../../shared/missions/MissionTypes";
import { colors } from "../../../theme/colors";

/**
 * Renders the active mini-mission HUD overlay for Canvas2D renderer.
 * @public
 */
export const drawAsteroidsMissionHUD: EffectDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world) {
    const mission = world.getResource<MissionProgress>("ActiveMission");
    if (!mission) return;

    ctx.save();

    const x = 20;
    const y = 30;
    const def = mission.definition;

    // Background panel
    ctx.fillStyle = "rgba(10, 15, 30, 0.75)";
    ctx.strokeStyle = mission.completed ? colors.green : mission.failed ? colors.pink : colors.cyan;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(x, y, 260, 50, 6);
    } else {
      ctx.rect(x, y, 260, 50);
    }
    ctx.fill();
    ctx.stroke();

    // Header Title
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = mission.completed ? colors.green : mission.failed ? colors.pink : colors.gold;
    const statusText = mission.completed ? " [¡COMPLETADA!]" : mission.failed ? " [FALLIDA]" : "";
    ctx.fillText(`MISIÓN: ${def.id.toUpperCase()}${statusText}`, x + 10, y + 20);

    // Subtitle / Counter
    ctx.font = "10px monospace";
    ctx.fillStyle = colors.white;

    let progressStr = `${mission.currentCount} / ${def.targetCount}`;
    if (def.timeLimit) {
      const remaining = Math.max(0, Math.ceil(def.timeLimit - mission.elapsedTime));
      progressStr += ` (${remaining}s)`;
    }

    ctx.fillText(progressStr, x + 10, y + 38);

    ctx.restore();
  }
};
