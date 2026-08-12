# Bolt's Journal

## Performance Learnings

- **Array allocation overhead in hot paths**: Standard JS array operations like `[...query]` or `slice(0, count).sort(...)` inside tick update loops (60 FPS) generate massive GC pressure. Zero-allocation patterns, such as reusing array structures with `arr.length = 0` and implementing custom in-place sorting (e.g., Shell Sort), significantly reduce frame times.
- **Query Caching & Frozen Arrays**: In development (`__DEV__`), core components and entity arrays are frozen via `Object.freeze` to protect against side effects. In production, we can safely bypass these allocations by caching and reusing pre-allocated arrays under internal fields like `_cachedEntitiesArray` or `_sortedEntitiesArray` without breaching types or determinism.
- **World Command Buffer queue swap**: Re-assigning `this.commands = []` on every frame flush allocates a new array. Swapping `commands` with a pooled array (`commandsPool`) and resetting it via `length = 0` prevents allocations completely.
