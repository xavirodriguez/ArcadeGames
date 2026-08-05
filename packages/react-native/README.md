
React Native bindings that glue `@tiny-aster/core` and `@tiny-aster/network-colyseus` into idiomatic React hooks and providers. This is the only package meant to be consumed directly by React Native screens/components.

## What lives here

### Hooks (`src/hooks/`)
- `useGame` — mounts/unmounts a `BaseGame` instance tied to the component lifecycle.
- `useGameLoop` — drives the fixed-timestep loop from a React component.
- `useWorld` — exposes the ECS `World` instance to React for reads/subscriptions.
- `useMultiplayer` — wires a game to a Colyseus-backed `NetworkTransport`.
- `useKeepAwake` — prevents the device from sleeping during active gameplay sessions.

### Providers (`src/providers/`)
- `GameServicesProvider` — React context provider exposing shared services (audio, input, config) to game screens without prop drilling.

## Peer dependencies

Requires `react >= 18` and `react-native` to be provided by the consuming app (this repo's `src/app`). They are declared as `peerDependencies`, not bundled.

## Scripts

\`\`\`bash
pnpm --filter=@tiny-aster/react-native build
pnpm --filter=@tiny-aster/react-native typecheck
\`\`\`