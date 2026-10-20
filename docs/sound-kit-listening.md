# Registro de Escucha y Mediciones Tímbricas (Puntos 7 y 8)

Conforme a la regla 7, se registran los parámetros modificados, lo que se debe escuchar y las mediciones objetivas de pico, RMS y duración efectiva (|x| >= 0.001 / -60 dBFS).

## Comparativa de Envolventes Lineal vs Exponencial (Punto 8)

### 1. `shoot` (Original) vs `shoot_exp` (Exponencial)
- **Parámetro modificado**: `envelope.curve = 'exp'` en la capa de ruido `noiseBurst`.
- **Qué se debe escuchar**: Ataque de transitorio más incisivo con una cola de ruido que decae más rápido de forma natural, otorgando un sonido de disparo más seco y percusivo.
- **Mediciones**:
  - Original (`shoot`): Peak = 0.4463, RMS = 0.1446, Duración efectiva = 104.6 ms
  - Exponencial (`shoot_exp`): Peak = 0.5135, RMS = 0.1498, Duración efectiva = 104.6 ms

### 2. `explosion_small` (Original) vs `explosion_small_exp` (Exponencial)
- **Parámetro modificado**: `envelope.curve = 'exp'` en las capas `subBoom` y `noiseBurst`.
- **Qué se debe escuchar**: Impacto inicial de baja frecuencia más concentrado con un desvanecimiento suave de la onda expansiva, reduciendo el retumbar prolongado.
- **Mediciones**:
  - Original (`explosion_small`): Peak = 0.9074, RMS = 0.1806, Duración efectiva = 262.4 ms
  - Exponencial (`explosion_small_exp`): Peak = 0.8868, RMS = 0.1280, Duración efectiva = 244.5 ms

### 3. `jump` (Original) vs `jump_exp` (Exponencial)
- **Parámetro modificado**: `envelope.curve = 'exp'` en la capa `zap`.
- **Qué se debe escuchar**: Barrido ascendente de salto con una caída de nivel exponencial más natural, haciendo el salto más liviano y retro.
- **Mediciones**:
  - Original (`jump`): Peak = 0.3054, RMS = 0.1654, Duración efectiva = 147.2 ms
  - Exponencial (`jump_exp`): Peak = 0.3157, RMS = 0.0972, Duración efectiva = 113.3 ms
