import { EffectDrawer, World } from "@tiny-aster/core";
import { ActiveMissionState } from "../../shared/missions/MissionTypes";
import { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";

/**
 * Overlay shape drawer for React Native Skia Mission HUD in Flappy Bird.
 * @public
 */
export const drawSkiaFlappyBirdMissionHUD: EffectDrawer<any, FlappyBirdComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const activeMission = world.getResource<ActiveMissionState>("ActiveMission");
    if (!activeMission) return;

    canvas.save();
    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);

    const x = 20;
    const y = 80;
    const width = 280;
    const height = 48;

    let statusColor = "#00D9FF";
    if (activeMission.completed) {
      statusColor = "#00FF41";
    } else if (activeMission.failed) {
      statusColor = "#FF4444";
    }

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("rgba(10, 14, 39, 0.85)"));
    const rect = Skia.XYWHRect(x, y, width, height);
    canvas.drawRect(rect, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(statusColor));
    paint.setStrokeWidth(1.5);
    canvas.drawRect(rect, paint);

    canvas.restore();
  }
};
