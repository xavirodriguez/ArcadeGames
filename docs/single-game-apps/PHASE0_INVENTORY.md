# Fase 0 — Línea base e inventario

**Fecha:** 2026-11-02  
**Repo:** https://github.com/xavirodriguez/ArcadeGames (master)

## 1. Compilación / versiones (estado actual)

| Elemento | Valor en repo | Notas |
|----------|---------------|-------|
| Expo | ~57.0.30 | No es SDK 55. El roadmap original está desfasado. |
| React | 19.2.3 | |
| React Native | 0.86.3 | |
| packageManager | pnpm@10.30.3 | |
| Node engines | >=20.19.0 | |
| app.json orientation | `"landscape"` (global) | |
| android.package / ios.bundleIdentifier | `com.ensable.asteroids` | Un solo package para el arcade completo |
| EAS projectId | `73fa3f33-9fb8-472b-a676-868aaac4e963` | |

**Acción local obligatoria:**

```bash
pnpm install
pnpm turbo run build
npx expo-doctor
npx expo start --android
```

## 2. Inventario real de juegos

Fuente: `src/app/index.tsx` + `src/games/` + `src/app/`.

### Juegos con carpeta en `src/games/`

arkanoid, asteroids, centipede, echorunner, flappybird, frogger, galaxian, geometrywars, hitandrun, outrun, platformer, pong, racing, space-invaders, tower-defense, shared

### Rutas extra

campaign, cyoa, blindstation, vertical-shmup

**Total menú:** 19 entradas. El “17” del texto original no está verificado.

### Flags propuestos

- pong: landscape, usesNetwork=true (Colyseus), usesSound=true
- flappybird / vertical-shmup: portrait probable
- resto: landscape, usesNetwork=false, usesSound=true

## 3. Medición bundle / APK

Pendiente en local (Atlas + APK preview). Son la referencia de Fase 0.

## 4. Criterio de Hecho

- [x] Inventario real
- [ ] App compila y arranca en Android (Expo 57)
- [ ] Tabla orientación/red/sonido revisada con código
- [ ] Dos tamaños de referencia medidos
