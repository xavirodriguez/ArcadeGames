# Fase 2 — Auditoría del grafo de imports

**Criterio de hecho:** `EXPO_PUBLIC_GAME_ID=pong npx expo export --platform android` produce un bundle sin módulos de otro juego.

El plegado solo se verifica con `export` (no con `expo start`).

## Puntos a auditar

- `src/app/index.tsx` → ArcadeHome solo con require cuando no hay GAME_ID
- `src/app/_layout.tsx` → no importar juegos concretos
- `src/app/campaign/**`, components, services
- `packages/react-native/**`

## Comandos

```bash
npx madge --circular --extensions ts,tsx src/games src/app
EXPO_PUBLIC_GAME_ID=pong npx expo export --platform android
```

## Spike expo-router root

Probar `plugins: [["expo-router", { root: "src/app-single" }]]` cuando hay GAME_ID. Si no sirve, dejar rutas tras el registry.

## Trampas

- No usar `Record<GameId, () => require(...)>`
- No usar `const id = process.env.EXPO_PUBLIC_GAME_ID` + switch
