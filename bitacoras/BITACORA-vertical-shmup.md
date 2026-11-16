# Cuaderno de Bitácora: Vertical Shmup (1942)

## 1. Perfil del Juego y Mapeo del Framework
- **Ruta**: `src/games/vertical-shmup/`
- **Mecánicas Clave**: Shoot 'em up vertical estilo 1942, oleadas procedimentales, patrones de disparo, body-contact damage, graze de balas enemigas, VFX compartidos (`spawnLayeredExplosion` + `ParticlePool`), overlay Game Over / pausa.
- **APIs/Framework**:
  - `runWithUnlockedRandomAndMutators`, `CollisionSystem2D`, `CombatSystem`, `SharedParticlePool`, `SharedVFX.spawnLayeredExplosion`
  - `ShmupGrazeSystem` (AUD-P2-01), `ShmupSingleHitGuardSystem`, `Damage` body contact (P2-01)
- **Tests**: Init, SimulationContracts (P0 + body contact), ParticlePool, GrazeContract + integración graze.

## 2. Matriz de estado — 2026-11-16

| ID | Tema | Estado |
|----|------|--------|
| P0 suite TDD | Movimiento, hitbox, disparo, ciclo de vida | Cerrado en #1180 / master (CI es fuente de verdad) |
| P1-03 | Game Over overlay + reinicio | **Hecho** (#1180) |
| P2-01 | Daño por contacto corporal | **Hecho** (#1180) |
| P2-06 | Matriz de capas documentada | **Hecho** (`docs/audit/vertical-shmup-collision-matrix.md`) |
| ParticlePool | Burst de explosiones ECS | **Hecho** (#1180) |
| Pause UI | Overlay PAUSA + Esc + chip | **En PR #1182** |
| Boss death VFX | `type: "boss"` + death juice | **En PR #1182** |
| AUD-P2-01 graze | Anillo + score + `ShmupGrazeSystem` | **En PR #1182** (implementado, no solo spec) |
| AUD-P2-01 bombas | Clear / invuln | **Abierto** |
| P2-02 | Config UPPER_SNAKE → camelCase completo | **Abierto** |
| P2-03 | Mutador `shmup_speed` (hoy solo `wave+=1`) | **Abierto** — verificar vigencia |
| P2-04 | Spawns Y negativas (medición) | **Abierto** |
| P2-05 | Profiling starfield/VFX | **Abierto** |
| P3 | Lint módulo, red, keybindings, QA móvil | **Abierto** |

## 3. PRs recientes

| PR | Contenido | Merge |
|----|-----------|-------|
| #1180 | P1-03, P2-01, P2-06, ParticlePool | 2026-11-16 (squash; commits posteriores pause/graze **no** entraron) |
| #1182 | Pause overlay, boss VFX, graze system + tests + docs | Pendiente CI + squash merge |

## 4. QA manual recomendado (rama #1182)

1. Esc → overlay PAUSA → CONTINUAR / Esc de nuevo.
2. Chip ❚❚ / ▶ en esquina.
3. Game Over → REINICIAR / R·Enter en web.
4. Matar boss → explosión mayor + shake.
5. Rozar balas enemigas sin tocar hitbox → score +10 por bala (una vez).

## 5. Próxima secuencia (post-merge #1182)

1. Confirmar CI verde de #1182 y merge.
2. Anotar resultado QA manual en esta bitácora.
3. Elegir: bombas, P2-03 mutador, o HUD graze.

---

# Registro histórico TDD / auditoría 2026-10-23

*(Conservado como archivo de investigación; el estado operativo actual es la §2 de 2026-11-16.)*

## Alcance de la iteración TDD

- **Rama histórica:** `feat/vertical-shmup-tdd-suite`
- Contratos P0 de movimiento, hitbox, disparo y ciclo de vida en `VerticalShmupSimulationContracts.test.ts`.
- Hallazgos AUD-P0-01…05 corregidos en código; validación posterior vía CI del juego.

### AUD-P2-01 (histórico)

En 2026-10-23 no había graze ni bombas. A 2026-11-16 **graze está implementado** en #1182; **bombas siguen abiertas**.

### Suite TDD P0

Archivo: `src/games/vertical-shmup/__tests__/VerticalShmupSimulationContracts.test.ts` — TEST-MOV-*, TEST-HIT-*, TEST-SHOOT-01, TEST-LIFECYCLE-01, más body-contact (P2-01).

### Validación

```bash
pnpm exec jest --config src/games/vertical-shmup/jest.config.cjs --runInBand --testPathPattern='src/games/vertical-shmup/__tests__'
pnpm exec tsc -p tsconfig.json --noEmit
```

CI de GitHub Actions es la fuente de verdad; no declarar verde sin traza.
