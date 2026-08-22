# Sentinel Guardian Journal

## Iteration Pass 1 - Room Input Validation & Sync Handshake Hardening

### Key Findings & Insights
- **Input Frame Protocol Version & Timestamp Validation Across Rooms**:
  Input frames sanitization in `AsteroidsRoom`, `SpaceInvadersRoom`, and `GeometryWarsRoom` previously assumed valid numeric `protocolVersion` and `timestamp` fields or fell back to loose truthiness checks (`frame.protocolVersion || 1`).
  Hardened all three rooms to explicitly check `typeof === "number" && !isNaN(...) && ... > 0` before assigning `protocolVersion` and `timestamp`, preventing invalid type injection.

- **`sync_tick` Server Tick & Timestamp Guards**:
  Both server room `sync_tick` handlers and `useMultiplayer.ts` client hook benefit from explicit finite & non-negative bounds checking (`isFinite(serverTick) && serverTick >= 0`). This defends against malformed server tick values or distorted timestamps resulting in negative/NaN RTT or corrupted local tick estimations.

- **Lock Restoration Discipline**:
  When accessing `gameplayRandom` on simulation worlds, methods like `unlock()` return `this` (truthy), so checking `wasLocked` before unlocking is essential.

## Iteration Pass 2 - Multi-room Input Sanitization & Local Tick Recovery Hardening

### Key Findings & Insights
- **Input Axis Clamping & Bounds Protection**:
  Ensured `SpaceInvadersRoom` and `GeometryWarsRoom` clamp all input axis coordinates within `[-1.0, 1.0]` using `Math.max(-1, Math.min(1, val))` for every axis entry, matching `AsteroidsRoom`.
- **Safe Fallback for `localTickRef`**:
  In `useMultiplayer.ts`, sanitized `localTickRef.current` calculation against `NaN`/negative values by falling back to `serverTickRef.current` rather than `0` if invalid state is detected, preventing client input frames from being rejected by room tick validation mid-session.

## Iteration Pass 3 - Room Whitelisting Symmetry & Lower-bound Input Frame Protection

### Key Findings & Insights
- **Action Whitelisting Symmetry**:
  Aligned `PongRoom` (`["moveUp", "moveDown", "move"]`) and `FlappyBirdRoom` (`["jump"]`) with explicit action whitelists in `allowedActions`.
- **Obsolete Tick Lower Bounds Protection**:
  Hardened `BaseRoom.handleInputMessage` to reject input frames with `tick < Math.max(0, currentServerTick - 120)` to prevent ancient out-of-order frames from polluting the input buffer.
