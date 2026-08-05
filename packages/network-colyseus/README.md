Colyseus-based implementation of the `NetworkTransport` contract defined in `@tiny-aster/core`. This is the adapter that connects the engine's authoritative-multiplayer abstractions to a real Colyseus server (see `server/` at the repo root).

## What lives here

- `ColyseusTransport` — implements `NetworkTransport` using `@colyseus/sdk`, bridging room connection, state sync, and message dispatch into the ECS `NetworkManager`.

## Dependencies

- `@tiny-aster/core` (workspace) — for the `NetworkTransport` contract and network component types.
- `@colyseus/sdk` — the Colyseus client SDK.

Per the core boundary rules, `@colyseus/*` imports are only allowed here and in the app layer — never inside `@tiny-aster/core` itself.

## Scripts

\`\`\`bash
pnpm --filter=@tiny-aster/network-colyseus build
pnpm --filter=@tiny-aster/network-colyseus typecheck
\`\`\`

## Related

- `server/` — the authoritative Colyseus room implementation this transport connects to.