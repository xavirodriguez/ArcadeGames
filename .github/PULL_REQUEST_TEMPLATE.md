## Descripción / Description
<!-- Describe brevemente los cambios introducidos y el problema o feature que resuelve. -->

## Checklist de Arquitectura y Buenas Prácticas

Por favor marca las siguientes casillas antes de solicitar revisión de código:

- [ ] **Determinismo y Semillas RNG**: ¿Usaste `runWithUnlockedRandomAndMutators` en vez de `gameplayRandom.lock/unlock` manual?
- [ ] **Reutilización de Colisionadores**: ¿Reutilizaste `createPaddleColliderConfig` si tu juego implementa paletas o bumpers?
- [ ] **Configuración de Tests**: ¿Registraste tu `src/games/<tu_juego>/jest.config.cjs` en la raíz (`jest.config.cjs`)?
- [ ] **Pooling Genérico**: ¿Usaste `SharedEntityPool` para proyectiles/partículas en hot path si aplica?
- [ ] **Guardas Automatizadas**: ¿Ejecutaste `pnpm run ci` localmente y pasaron todas las verificaciones?
