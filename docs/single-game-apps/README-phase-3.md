# Fase 3 — Config de Expo por juego

## Integración rápida

```bash
mv app.json app.json.bak
# app.config.ts ya en la raíz (este PR)

pnpm exec tsx scripts/ensure-branding.ts pong
pnpm exec tsx scripts/snapshot-expo-config.ts pong

# Verificar
npx expo config --type public | head
EXPO_PUBLIC_GAME_ID=pong npx expo config --type public
```

## Criterio de Hecho

1. Sin `EXPO_PUBLIC_GAME_ID` → config del arcade.
2. Con `EXPO_PUBLIC_GAME_ID=pong` → name/package/scheme de Pong.
3. Snapshots estables en `docs/single-game-apps/config-snapshots/`.
4. Branding placeholder al menos para el piloto.

## Scripts

| Script | Acción |
|--------|--------|
| `scripts/ensure-branding.ts` | Copia iconos del arcade a `src/games/<id>/branding/` |
| `scripts/snapshot-expo-config.ts` | `expo config --json` por juego |

`easProjectId` por juego se rellena en Fase 4.
