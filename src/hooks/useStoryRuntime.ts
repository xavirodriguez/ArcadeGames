import { useSyncExternalStore, useCallback, useRef } from "react";
import { StoryRuntime, StoryState, StoryNode, EventBus } from "@tiny-aster/core";

export interface UseStoryRuntimeResult {
  state: StoryState | null;
  currentNode: StoryNode | null;
  flags: Record<string, boolean>;
  variables: Record<string, number | string | boolean | any>;
  evidence: string[];
}

const EMPTY_SNAPSHOT: UseStoryRuntimeResult = {
  state: null,
  currentNode: null,
  flags: {},
  variables: {},
  evidence: []
};

/**
 * Custom React hook providing a synchronized single source of truth for `StoryRuntime` state in React components.
 *
 * Uses `useSyncExternalStore` subscribing to `story:state_changed` and `story:node_changed` on the `EventBus`
 * to re-render React components safely and deterministically whenever narrative state or active nodes transition.
 */
export function useStoryRuntime(
  runtime: StoryRuntime | null,
  eventBus?: EventBus | null
): UseStoryRuntimeResult {
  const cacheRef = useRef<{
    runtime: StoryRuntime | null;
    version: number;
    currentNode: StoryNode | null;
    snapshot: UseStoryRuntimeResult;
  }>({
    runtime: null,
    version: -1,
    currentNode: null,
    snapshot: EMPTY_SNAPSHOT
  });

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!runtime) return () => {};
      const bus = eventBus || (runtime as any).eventBus;
      if (!bus) return () => {};

      const unsub1 = bus.on("story:state_changed" as any, onStoreChange);
      const unsub2 = bus.on("story:node_changed" as any, onStoreChange);
      return () => {
        unsub1();
        unsub2();
      };
    },
    [runtime, eventBus]
  );

  const getSnapshot = useCallback((): UseStoryRuntimeResult => {
    if (!runtime) return EMPTY_SNAPSHOT;

    const currentVersion = typeof (runtime as any).getVersion === "function"
      ? (runtime as any).getVersion()
      : 0;
    const currentNode = runtime.getCurrentNode();

    if (
      cacheRef.current.runtime === runtime &&
      cacheRef.current.version === currentVersion &&
      cacheRef.current.currentNode === currentNode
    ) {
      return cacheRef.current.snapshot;
    }

    const st = runtime.getState();
    const newSnapshot: UseStoryRuntimeResult = {
      state: st,
      currentNode,
      flags: st.flags || {},
      variables: st.variables || {},
      evidence: st.evidence || []
    };

    cacheRef.current = {
      runtime,
      version: currentVersion,
      currentNode,
      snapshot: newSnapshot
    };

    return newSnapshot;
  }, [runtime]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
