# Fase 0 + Fase 1 — Artefactos

## Integración

1. Copia `src/manifests/` al monorepo.
2. Copia `scripts/validate-manifests.ts`.
3. Añade `"validate:manifests": "tsx scripts/validate-manifests.ts"`.
4. Ejecuta el validador → debe pasar con 19 manifests.
5. Añade a CI.

## Package names (irreversibles)

- space-invaders → com.ensable.spaceinvaders
- tower-defense → com.ensable.towerdefense
- vertical-shmup → com.ensable.verticalshmup

## Piloto

Pong (red) + Flappy Bird o vertical-shmup (orientación distinta).
