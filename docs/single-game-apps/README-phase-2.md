# Fase 2 — Selección del juego en el bundle

## Integración

1. `pnpm exec tsx scripts/generate-registry.ts`
2. Renombrar home actual → `ArcadeHome.tsx`
3. Usar patrón de `docs/single-game-apps/index.tsx.example` en `src/app/index.tsx`
4. Verificar: `EXPO_PUBLIC_GAME_ID=pong npx expo export --platform android`

## Variable única

`EXPO_PUBLIC_GAME_ID` en shell, app.config.ts y código (Expo la inlinea).

Sin variable → arcade completo.
