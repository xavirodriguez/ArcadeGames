# ADR: Shared Touch Input Module & Routing Architecture

## Context & Problem Statement
Prior to this architecture, games managed touch controls using disparate touch components (`VirtualJoystick`, `GestureActionButton`, `TouchableOpacity`, custom `PanResponder`/`Gesture.Manual`) scattered across individual screen implementations, resulting in code duplication, inconsistencies in touch gesture recognition, and potential UI state re-render overhead from `setState` on touch.

## Decision
We established a platform-agnostic Touch Control Architecture composed of:
1. **`TouchInputState` (`packages/core/src/input/TouchInputState.ts`)**:
   - Platform-agnostic, pure TypeScript mutable state contract.
   - Manages continuous normalized movement axes (`moveX`, `moveY` in `[-1, 1]`), boolean button flags (`buttons`), paddle/slider positions (`paddlePos`), and screen target coordinates (`pointerPos`).
   - Manages discrete event queues (`taps`, `flings`, `laneShifts`) cleared per simulation frame (`consumeEvents()`).
2. **`TouchInputUtils` (`packages/core/src/input/TouchInputUtils.ts`)**:
   - Pure math helpers: `applyDeadzone`, `normalizeVector`, `snapTo4Way`, `snapTo8Way`, `clamp`, and `mapPointerToPaddle`.
3. **Reusable Touch Control Components (`src/components/controls/`)**:
   - `TouchInputProvider`: Context wrapper with non-blocking `__DEV__` check for `GestureHandlerRootView` ancestor.
   - `TouchVirtualJoystick`: Mono-finger joystick supporting fixed and floating modes, deadzone, and throttled haptic feedback on direction sector changes.
   - `TouchActionButton`: Tap button triggering instantly on `onBegin`, isolated from drag zones.
   - `TouchHoldButton`: LongPress/Hold button releasing on `onFinalize` to guarantee no stuck states upon gesture cancellation.
   - `TouchDragZone`: `Gesture.Pan()` with `minDistance(0)`, supporting absolute screen coordinates, relative deltas, and platformer horizontal directional filtering (`activeOffsetX` / `failOffsetY`).
   - `TouchTapZone`: Screen tap zone enqueuing discrete tap events `{ x, y }`.

## Input Flow & State Routing Rules
- Gestures execute `.runOnJS(true)` directly updating the mutable `TouchInputState` object without calling React `setState` during touch movements.
- The ECS game simulation reads `TouchInputState` once per tick and passes states through `BaseGame.setInputState()` or multiplayer message channels (`room.send("input", ...)`).
- Existing keyboard and gamepad control channels remain intact and operational.
