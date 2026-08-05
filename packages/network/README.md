Transport-agnostic networking primitives shared by every multiplayer transport implementation. Depends only on `@tiny-aster/core` — no Colyseus, no WebSocket implementation, no platform code.

## What lives here

- `NetTypes` — shared type definitions for network messages/state.
- `InputRingBuffer` / `InputSerializer` — capture and serialize local input for transmission.
- `PredictionBuffer` / `RemoteInputPredictor` — client-side prediction support for remote entities.
- `InterpolationSystem` — smooths remote entity state between server updates.
- `ReplayManager` — replays recorded input/state sequences, reusing the same determinism guarantees as `@tiny-aster/core`.

## Where this fits

This package defines the transport-agnostic *logic* of netcode (prediction, interpolation, serialization). The actual wire protocol and connection handling live in transport-specific packages such as `@tiny-aster/network-colyseus`.

## Scripts

\`\`\`bash
pnpm --filter=@tiny-aster/network build
pnpm --filter=@tiny-aster/network typecheck
\`\`\`
```