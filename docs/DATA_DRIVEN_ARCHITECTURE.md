# Arquitectura Data-Driven y Declarativa de TinyAster

Este documento explica cómo funciona el sistema data-driven y declarativo del motor de juegos Arcade. La arquitectura está dividida en tres pilares fundamentales: **Config Schemas con Zod**, **Blueprints Declarativos de Entidades** y **Carga de Contenido Externo Validado**.

---

## 1. Config Schemas por Juego (`*ConfigSchema.ts`)

Cada juego define un esquema Zod que extiende `BaseConfigSchema` y `ScreenDimensionsSchema`. Todas las constantes de gameplay (velocidades, daño, scores, cooldowns, tablas de nivel y spawn) se declaran con valores `.default()`.

### Ejemplo: `ASTEROID_TIERS` en Asteroids
En lugar de valores escalares sueltos, las entidades con niveles o tipos estructurados se definen como tablas validadas:

```ts
export const AsteroidConfigSchema = BaseConfigSchema.extend({
  // ...
  ASTEROID_TIERS: z.array(z.object({
    size: z.string(),
    radius: z.number().positive(),
    score: z.number().nonnegative(),
    splitsInto: z.string().nullable(),
    splitCount: z.number().int().nonnegative(),
    speedRange: z.object({
      min: z.number(),
      max: z.number()
    })
  })).default([
    { size: "large", radius: 40, score: 20, splitsInto: "medium", splitCount: 2, speedRange: { min: 20, max: 100 } },
    { size: "medium", radius: 20, score: 50, splitsInto: "small", splitCount: 2, speedRange: { min: 50, max: 150 } },
    { size: "small", radius: 10, score: 100, splitsInto: null, splitCount: 0, speedRange: { min: 80, max: 200 } }
  ]),
  // ...
});
```

La lógica del juego (`EntityFactory.ts`, `AsteroidCollisionSystem.ts`) no contiene reglas rígidas o switches hardcodeados, sino que consulta directamente la tabla de configuración (`config.ASTEROID_TIERS.find(t => t.size === size)`).

---

## 2. Blueprints Declarativos de Entidades (`EntityBlueprintDef`)

En `@tiny-aster/gameplay-kit`, las entidades se pueden definir como estructuras de datos serializables con el tipo y esquema `EntityBlueprintDef`.

### Estructura de un Blueprint
```ts
export type EntityBlueprintDef = {
  id: string;
  tags?: string[];
  components: ComponentSpec[];
  onSpawn?: Array<{
    event: string;
    payload?: Record<string, any>;
  }>;
};
```

### Evaluación de Expresiones e Intérprete `spawnFromBlueprint`
Los valores de los componentes soportan expresiones dinámicas que se evalúan en tiempo de instancia usando `spawnFromBlueprint(world, def, args)`:

1. **`$args.<prop>`**: Accede a las propiedades pasadas en los argumentos de spawn (ej. `$args.x`, `$args.y`).
2. **`$config.<prop>`**: Accede a las variables cargadas en el recurso `"GameConfig"` del `World`.
3. **`$random(min, max)`**: Genera números pseudoaleatorios deterministas usando exclusivamente `world.gameplayRandom` para mantener la sincronización y determinismo de simulación.
4. **Condicionales `when`**: Los componentes soportan expresiones condicionales (ej. `when: "mode === 'story'"`).
5. **Eventos `onSpawn`**: Emite eventos declarativos a través del `EventBus` (`eventBus.emitDeferred(...)`).

### Compatibilidad y Escape Hatch
El `BlueprintRegistry` en `@tiny-aster/core` admite tanto definiciones de datos serializables como callbacks `spawn` imperativos tradicionales, permitiendo una migración gradual sin romper entidades existentes.

---

## 3. Carga de Contenido Externo Validado (`ContentLoader`)

### Estructura de Archivos en `content/`
El contenido del juego se almacena externamente en JSON dentro de la carpeta raíz `content/<gameId>/`:
* `content/tower-defense/levels/classic.json`
* `content/tower-defense/towers.json`
* `content/tower-defense/creeps.json`

### Precarga Determinista en `AssetManifest`
El `AssetManifest` de la definición del juego (`GameDefinition`) incluye una propiedad `data?: { id: string, path: string }[]`. Todo contenido se precarga **antes** de `createSimulation(seed, options)` para garantizar que no existan lecturas I/O asíncronas dentro del tick de simulación.

### Validación con `ContentLoader`
`ContentLoader.load(schema, data, contentId)` valida el JSON contra el esquema Zod correspondiente. Si los datos son inválidos, lanza un `ContentValidationError` descriptivo especificando la ruta exacta del error (ej. `"waves[2].creeps[0].count: Expected positive number"`).

### Selección de Nivel via Options
`createSimulation(seed, { level: "classic" })` permite seleccionar y cargar variaciones de nivel externas, utilizando los valores `.default()` de Zod como fallback transparente para tests.
