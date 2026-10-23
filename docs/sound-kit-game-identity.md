# Propuesta de Identidad Sonora y Juice por Juego (Punto 22a)

**Estado de la propuesta:** Pendiente de aprobación (Regla 11)

Este documento establece la auditoría de inventario de audio existente en TinyAsterEngine, la asignación de paletas retro por juego y la propuesta de refinamiento de *juice* auditivo empleando el nuevo paquete `@tiny-aster/arcade-sound-kit`.

---

## 1. Inventario por Juego y Mapeo de Cues

| Juego | Eventos de Juego Actuales | Paleta Retro Recomendada | Receta / Cue Propuesto |
|---|---|---|---|
| **Asteroids** | `shoot`, `thrust_loop`, `explosion_small`, `explosion_large`, `hyperspace` | Chip retro de 8-bit (PolyBLEP Pulse, SubBoom) | `laser`, `thrust_loop`, `explosion_small_exp`, `explosion_large` |
| **Space Invaders** | `shoot`, `shoot_enemy`, `invader_step_1..4`, `ufo_loop`, `explosion` | Paleta analógica / Arcade 1978 (Sine, Noise Burst) | `shoot`, `invader_step`, `ufo_sine`, `explosion` |
| **Flappy Bird** | `flap`, `score`, `hit`, `die`, `glide_loop` | Paleta cálida / Oficina 8:47 (Pulse 25%, Square) | `flap`, `score_fm`, `hit`, `die_zap`, `glide_loop` |
| **Pong** | `bounce_paddle`, `bounce_wall`, `score` | Síntesis pura 1972 (Square wave, Clicks) | `blip_paddle`, `blip_wall`, `score_beep` |
| **Platformer** | `jump`, `land`, `dash`, `collectible_pickup`, `stomp`, `checkpoint` | Paleta 16-bit FM + Noise (Square, FM Coin, White Noise) | `jump_exp`, `land`, `dash`, `coin_fm`, `stomp`, `checkpoint` |
| **Arkanoid** | `bounce_paddle`, `bounce_brick`, `powerup_spawn`, `powerup_pickup`, `laser_shoot` | Paleta Taito Arcade (FM Bell, Triangle, LFSR) | `bounce_paddle`, `brick_shatter`, `powerup_vibrato`, `laser` |
| **Geometry Wars** | `shoot_vector`, `enemy_spawn`, `black_hole_loop`, `bomb_detonate` | Paleta Synthwave / FM Vector (PolyBLEP Saw, Unison, Chorus) | `vector_laser`, `enemy_spawn_fm`, `black_hole_lfo`, `bomb_unison` |
| **Echo Runner** | `step_run`, `echo_dash`, `echo_clone`, `time_warp` | Paleta Cyberpunk / Post-FX (Delays, Chorus, Bitcrush) | `step_echo`, `dash_chorus`, `clone_fm`, `warp_bitcrush` |
| **Frogger** | `frog_hop`, `water_splash`, `car_horn`, `home_reach` | Paleta Namco 8-bit (Square Duty 12.5%, Noise) | `hop_blip`, `splash_noise`, `car_horn`, `home_jingle` |
| **Tower Defense** | `tower_shoot`, `laser_beam`, `creep_hit`, `wave_start`, `upgrade` | Paleta de Estrategia Cyber (FM Impact, Unison Pad) | `tower_cannon`, `laser_beam`, `creep_pop`, `wave_start`, `bell_fm` |

---

## 2. Propuesta de Refinamiento de Juice Auditivo

### A. Capas de Impacto y Peso (Weight & Impact)
- **Problemática actual**: Los disparos e impactos compartían un volumen estático sin variaciones de pitch, produciendo fatiga auditiva.
- **Propuesta de Mejora**:
  - Incorporar variación de micro-pitch de $\pm 3\%$ a $\pm 5\%$ mediante el campo `variation.pitch` de la receta en cada disparo.
  - Para impactos críticos o destrucción de jefes, combinar un transitorio incisivo (`click` de alta frecuencia) con un cuerpo subsónico (`subBoom` de $120 \to 40$ Hz con envolvente exponencial `curve: 'exp'`).

### B. Retroalimentación de Movimiento (Locomotion Feedback)
- **Problemática actual**: Los saltos y caídas en juegos de plataformas resultaban bruscos y planos.
- **Propuesta de Mejora**:
  - Implementar barridos exponenciales en saltos (`startHz: 350`, `endHz: 1000`, `curve: 'exp'`) para lograr una sensación de ligereza.
  - Añadir modulación LFO suave en habilidades de deslizamiento (`glide_loop`) para simular la turbulencia del aire.

### C. Progresión y Recompensas (Rewards)
- **Problemática actual**: Las monedas y coleccionables sonaban mono-tonales.
- **Propuesta de Mejora**:
  - Aplicar síntesis FM (`coin_fm`) con modulación de fase de ratio $2.0$ e índice decayendo de $3.0 \to 0$, logrando el clásico brillo metálico arcade de dos tonos en monedero.

---

## 3. Estado de Decisión
*Esta propuesta queda registrada en `docs/sound-kit-decisions.md` y `docs/sound-kit-game-identity.md` a la espera de la aprobación del usuario antes de alterar las constantes de audio de los juegos.*
