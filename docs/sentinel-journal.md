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
