# Registro de Escucha y Mediciones Tímbricas (Puntos 7 y 8)

Conforme a la regla 7, se registran los parámetros modificados, lo que se debe escuchar y las mediciones objetivas de pico, RMS y duración efectiva (|x| >= 0.001 / -60 dBFS).

## Comparativa de Envolventes Lineal vs Exponencial (Punto 8)

### 1. `shoot` (Original) vs `shoot_exp` (Exponencial)
- **Parámetro modificado**: `envelope.curve = 'exp'` en la capa de ruido `noiseBurst`.
- **Qué se debe escuchar**: Ataque de transitorio más incisivo con una cola de ruido que decae más rápido de forma natural, otorgando un sonido de disparo más seco y percusivo.
- **Mediciones**:
  - Original (`shoot`): Peak = 0.8913, RMS = 0.2891, Duración efectiva = 104.3 ms
  - Exponencial (`shoot_exp`): Peak = 0.8913, RMS = 0.2797, Duración efectiva = 104.3 ms

### 2. `explosion_small` (Original) vs `explosion_small_exp` (Exponencial)
- **Parámetro modificado**: `envelope.curve = 'exp'` en las capas `subBoom` y `noiseBurst`.
- **Qué se debe escuchar**: Impacto inicial de baja frecuencia más concentrado con un desvanecimiento suave de la onda expansiva, reduciendo el retumbar prolongado.
- **Mediciones**:
  - Original (`explosion_small`): Peak = 0.8913, RMS = 0.2012, Duración efectiva = 262.4 ms
  - Exponencial (`explosion_small_exp`): Peak = 0.8913, RMS = 0.1589, Duración efectiva = 237.6 ms

### 3. `jump` (Original) vs `jump_exp` (Exponencial)
- **Parámetro modificado**: `envelope.curve = 'exp'` en la capa `zap`.
- **Qué se debe escuchar**: Barrido ascendente de salto con una caída de nivel exponencial más natural, haciendo el salto más liviano y retro.
- **Mediciones**:
  - Original (`jump`): Peak = 0.8913, RMS = 0.3120, Duración efectiva = 147.2 ms
  - Exponencial (`jump_exp`): Peak = 0.8913, RMS = 0.2535, Duración efectiva = 131.0 ms
