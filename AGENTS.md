# Guía de Arquitectura Visual de Tiny Aster

Para mantener el sistema de diseño visual limpio, accesible y consistente, todos los desarrolladores (humanos y agentes de IA) deben seguir estas cuatro reglas arquitectónicas fundamentales:

## Reglas del Sistema de Diseño

1. **No introducir colores hexadecimales directamente en los componentes:**
   - Evita el uso de cadenas de color fijas como `"#00f0ff"`, `"#ff0055"` o `"#ffffff"` en las pantallas, componentes o estilos locales.
   - En su lugar, utiliza tokens centralizados desde el tema, por ejemplo, `colors.cyan`, `colors.pink`, `colors.white`, etc.

2. **Los valores visuales compartidos viven en `src/theme/`:**
   - Todos los colores, espaciados, tipografías, radios de bordes y efectos de resplandor (glow) deben residir y gestionarse exclusivamente dentro de la carpeta `src/theme/` (por ejemplo, en `src/theme/colors.ts`).
   - Nota crítica para tests en servidor/headless: Cuando importes colores en simulaciones o archivos de juegos para que los use el motor, importa **directamente** desde `src/theme/colors` (por ejemplo, `import { colors } from "../../../theme/colors"`) en lugar del índice genérico `src/theme/index.ts` o `@/theme`. Esto evita la carga transitiva de dependencias de `react-native` (como `Platform` desde `effects.ts`), previniendo errores de `ReactNativePublicAPI is not defined` en entornos Node/headless de servidor.

3. **Los componentes de UI repetidos entre juegos viven en `src/components/ui/`:**
   - Componentes tales como pantallas de juego contenedoras (`GameScreen`), botones retro de neón (`NeonButton`), títulos parpadeantes (`GameTitle`), entradas de nombres (`PlayerNameInput`), instrucciones de control (`GameInstructions`), records de puntaje (`HighScoreText`) y botones de regreso (`BackButton`) deben ser reutilizados de manera centralizada.
   - Si creas o diseñas un nuevo juego, hereda y usa estos componentes reutilizables de UI.

4. **StyleSheet local solo para estilos específicos del juego:**
   - Las hojas de estilo locales de cada juego (por ejemplo, posicionamiento de controles, scoreboard específico de Pong, disposición del gameplay) solo deben usarse para las necesidades estructurales o de layout particulares de esa pantalla.
   - El estilo visual de la aplicación y la marca se gobiernan centralmente desde el tema.

---

## Validación

Antes de realizar entregas o commits, asegúrate de correr los quality gates correspondientes:

```bash
pnpm run test
pnpm run lint
pnpm run typecheck:core
pnpm run typecheck:app
pnpm run check:core-boundaries
pnpm run ci
```
