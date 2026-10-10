export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function applyDeadzone(
  x: number,
  y: number,
  deadzone: number = 0.1
): { x: number; y: number } {
  const magnitude = Math.sqrt(x * x + y * y);
  if (magnitude <= deadzone) {
    return { x: 0, y: 0 };
  }

  const normalizedMagnitude = Math.min(1, (magnitude - deadzone) / (1 - deadzone));
  return {
    x: (x / magnitude) * normalizedMagnitude,
    y: (y / magnitude) * normalizedMagnitude,
  };
}

export function normalizeVector(x: number, y: number): { x: number; y: number } {
  const magnitude = Math.sqrt(x * x + y * y);
  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }
  const scale = Math.min(1, magnitude) / magnitude;
  return {
    x: x * scale,
    y: y * scale,
  };
}

export function snapDirection(
  x: number,
  y: number,
  directions: 4 | 8 = 8
): { x: number; y: number } {
  const magnitude = Math.sqrt(x * x + y * y);
  if (magnitude < 0.1) {
    return { x: 0, y: 0 };
  }

  const angle = Math.atan2(y, x);

  if (directions === 4) {
    const step = Math.PI / 2;
    const snappedAngle = Math.round(angle / step) * step;
    return {
      x: Math.round(Math.cos(snappedAngle)),
      y: Math.round(Math.sin(snappedAngle)),
    };
  } else {
    const step = Math.PI / 4;
    const snappedAngle = Math.round(angle / step) * step;
    const dirX = Math.cos(snappedAngle);
    const dirY = Math.sin(snappedAngle);
    return {
      x: Math.abs(dirX) < 0.001 ? 0 : Math.round(dirX * 1000) / 1000,
      y: Math.abs(dirY) < 0.001 ? 0 : Math.round(dirY * 1000) / 1000,
    };
  }
}

export function mapTouchToPaddlePosition(
  touchX: number,
  containerWidth: number,
  paddleWidth: number = 0
): number {
  if (containerWidth <= 0) return 0.5;

  const halfPaddle = paddleWidth / 2;
  const minX = halfPaddle;
  const maxX = containerWidth - halfPaddle;

  const clampedX = clamp(touchX, minX, maxX);

  if (maxX <= minX) {
    return 0.5;
  }

  return clamp(clampedX / containerWidth, 0, 1);
}
