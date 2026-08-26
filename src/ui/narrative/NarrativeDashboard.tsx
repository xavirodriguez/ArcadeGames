import React, { useState, useSyncExternalStore, useCallback } from "react";
import { StoryRuntime, MiniGameModifierResolver, StoryRuntimeSnapshot } from "@tiny-aster/core";
import { asteroidsPOCEncounter, spaceInvadersPOCEncounter, asteroidsReduxPOCEncounter } from "../../games/shared/story/StoryEncounters";

export interface NarrativeDashboardProps {
  storyRuntime: StoryRuntime;
  isVisible: boolean;
  onToggle: () => void;
  onJumpToNode?: (nodeId: string) => void;
  className?: string;
}

/**
 * Designer & Developer Introspection Dashboard for live StoryRuntime debugging.
 *
 * @remarks
 * Displays node status, active boolean flags, dynamic state variables, objectives,
 * active minigame modifiers, narrative history/events, and provides interactive control tools.
 *
 * @public
 */
export const NarrativeDashboard: React.FC<NarrativeDashboardProps> = ({
  storyRuntime,
  isVisible,
  onToggle,
  onJumpToNode,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "flags" | "variables" | "objectives" | "modifiers" | "history">("overview");
  const [selectedJumpNode, setSelectedJumpNode] = useState<string>("");
  const [newFlagKey, setNewFlagKey] = useState("");
  const [newVarKey, setNewVarKey] = useState("");
  const [newVarVal, setNewVarVal] = useState("");

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const interval = setInterval(() => {
        onStoreChange();
      }, 250);
      return () => clearInterval(interval);
    },
    []
  );

  const getSnapshot = useCallback(() => {
    return `${storyRuntime.getVersion()}_${storyRuntime.getCurrentNodeId()}`;
  }, [storyRuntime]);

  useSyncExternalStore(subscribe, getSnapshot);

  if (!isVisible) return null;

  const graph = storyRuntime.getGraph();
  const currentNode = storyRuntime.getCurrentNode();
  const state = storyRuntime.getState();
  const flags = state.flags || {};
  const variables = state.variables || {};
  const objectives = state.objectives || {};
  const history = state.history || [];

  const currentEncounter = currentNode?.meta?.encounterId === "poc-space-invaders-1"
    ? spaceInvadersPOCEncounter
    : currentNode?.meta?.encounterId === "poc-asteroids-redux-1"
    ? asteroidsReduxPOCEncounter
    : asteroidsPOCEncounter;

  const snapshot: StoryRuntimeSnapshot = {
    graphId: state.graphId,
    currentNodeId: state.currentNodeId,
    flags: state.flags,
    variables: state.variables,
    selectedChoices: state.selectedChoices,
    objectives: state.objectives,
    evidence: state.evidence,
    history: state.history
  };

  const resolver = new MiniGameModifierResolver();
  const resolvedModifiers = resolver.resolve(
    snapshot,
    currentEncounter
  );

  const handleToggleFlag = (key: string) => {
    const currentVal = storyRuntime.getFlag(key);
    storyRuntime.setFlag(key, !currentVal);
  };

  const handleAddFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlagKey.trim()) return;
    storyRuntime.setFlag(newFlagKey.trim(), true);
    setNewFlagKey("");
  };

  const handleUpdateVar = (key: string, rawVal: string) => {
    let parsed: number | string | boolean = rawVal;
    if (rawVal === "true") parsed = true;
    else if (rawVal === "false") parsed = false;
    else if (!isNaN(Number(rawVal)) && rawVal.trim() !== "") parsed = Number(rawVal);
    storyRuntime.setVariable(key, parsed);
  };

  const handleAddVar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVarKey.trim()) return;
    handleUpdateVar(newVarKey.trim(), newVarVal);
    setNewVarKey("");
    setNewVarVal("");
  };

  const handleCompleteObjective = (objId: string) => {
    storyRuntime.applyEffect({ type: "completeObjective", objectiveId: objId });
  };

  const handleJump = () => {
    if (!selectedJumpNode) return;
    storyRuntime.navigateToNode(selectedJumpNode);
    if (onJumpToNode) onJumpToNode(selectedJumpNode);
  };

  return (
    <div
      className={`narrative-dashboard-overlay fixed bottom-4 right-4 w-[540px] max-h-[700px] flex flex-col bg-slate-900/95 border border-cyan-500/40 rounded-lg shadow-2xl backdrop-blur-md text-slate-100 font-mono text-xs z-50 ${className}`}
      style={{
        boxShadow: "0 0 20px rgba(6, 182, 212, 0.25)",
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/30 bg-slate-950/80 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <span className="text-cyan-400 text-base">📖</span>
          <h3 className="font-bold text-sm tracking-wide text-cyan-300">
            NARRATIVE RUNTIME DASHBOARD
          </h3>
          <span className="px-2 py-0.5 text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
            v{storyRuntime.getVersion()}
          </span>
        </div>
        <button
          onClick={onToggle}
          className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          title="Close Dashboard"
        >
          ✕
        </button>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex border-b border-slate-800 bg-slate-950/40 px-2 py-1 space-x-1">
        {(["overview", "flags", "variables", "objectives", "modifiers", "history"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded capitalize transition text-[11px] font-semibold ${
                activeTab === tab
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {tab}
            </button>
          )
        )}
      </nav>

      {/* Main Tab Content */}
      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <section className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2">
              <h4 className="text-cyan-400 font-bold border-b border-slate-800 pb-1">
                Graph Meta
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div><span className="text-slate-500">Graph ID:</span> {graph?.id || "None"}</div>
                <div><span className="text-slate-500">Title:</span> {graph?.title || "N/A"}</div>
                <div><span className="text-slate-500">Entry Node:</span> {graph?.entryNodeId}</div>
                <div><span className="text-slate-500">Total Nodes:</span> {graph ? Object.keys(graph.nodes).length : 0}</div>
              </div>
            </section>

            <section className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2">
              <h4 className="text-cyan-400 font-bold border-b border-slate-800 pb-1">
                Active Node
              </h4>
              <div className="space-y-1 text-slate-300">
                <div><span className="text-slate-500">ID:</span> <code className="text-amber-300 font-bold">{currentNode?.id || "None"}</code></div>
                <div><span className="text-slate-500">Type:</span> <span className="uppercase px-1.5 py-0.5 text-[10px] bg-indigo-950 text-indigo-300 rounded">{currentNode?.type}</span></div>
                <div><span className="text-slate-500">Title:</span> {currentNode?.title || "N/A"}</div>
                {currentNode?.sceneToLoad && (
                  <div><span className="text-slate-500">Scene to Load:</span> <code className="text-emerald-400">{currentNode.sceneToLoad}</code></div>
                )}
              </div>
            </section>

            {/* Force Jump Tool */}
            <section className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2">
              <h4 className="text-cyan-400 font-bold border-b border-slate-800 pb-1">
                Force Node Navigation
              </h4>
              <div className="flex space-x-2">
                <select
                  value={selectedJumpNode}
                  onChange={(e) => setSelectedJumpNode(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value="">Select target node...</option>
                  {graph &&
                    Object.keys(graph.nodes).map((nodeId) => (
                      <option key={nodeId} value={nodeId}>
                        {nodeId} ({graph.nodes[nodeId].type})
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleJump}
                  disabled={!selectedJumpNode}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded transition"
                >
                  Jump
                </button>
              </div>
            </section>
          </div>
        )}

        {/* FLAGS TAB */}
        {activeTab === "flags" && (
          <div className="space-y-3">
            <form onSubmit={handleAddFlag} className="flex space-x-2">
              <input
                type="text"
                placeholder="New flag key..."
                value={newFlagKey}
                onChange={(e) => setNewFlagKey(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
              />
              <button type="submit" className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold">
                Add Flag
              </button>
            </form>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="py-1">Flag Key</th>
                  <th className="py-1">Status</th>
                  <th className="py-1 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(flags).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-500">No flags active.</td>
                  </tr>
                ) : (
                  Object.entries(flags).map(([key, val]) => (
                    <tr key={key} className="border-b border-slate-850 hover:bg-slate-800/30">
                      <td className="py-1.5 font-mono text-slate-300">{key}</td>
                      <td className="py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${val ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800"}`}>
                          {String(val)}
                        </span>
                      </td>
                      <td className="py-1.5 text-right">
                        <button
                          onClick={() => handleToggleFlag(key)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                        >
                          Toggle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VARIABLES TAB */}
        {activeTab === "variables" && (
          <div className="space-y-3">
            <form onSubmit={handleAddVar} className="flex space-x-2">
              <input
                type="text"
                placeholder="Key"
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                className="w-1/3 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
              />
              <input
                type="text"
                placeholder="Value"
                value={newVarVal}
                onChange={(e) => setNewVarVal(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
              />
              <button type="submit" className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold">
                Set
              </button>
            </form>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="py-1">Variable Key</th>
                  <th className="py-1">Current Value</th>
                  <th className="py-1 text-right">Edit</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(variables).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-500">No variables set.</td>
                  </tr>
                ) : (
                  Object.entries(variables).map(([key, val]) => (
                    <tr key={key} className="border-b border-slate-850 hover:bg-slate-800/30">
                      <td className="py-1.5 font-mono text-slate-300">{key}</td>
                      <td className="py-1.5 font-bold text-amber-300">{String(val)}</td>
                      <td className="py-1.5 text-right">
                        <input
                          type="text"
                          defaultValue={String(val)}
                          onBlur={(e) => handleUpdateVar(key, e.target.value)}
                          className="w-20 bg-slate-900 border border-slate-700 rounded px-1 text-right text-slate-200 text-[10px]"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* OBJECTIVES TAB */}
        {activeTab === "objectives" && (
          <div className="space-y-3">
            {Object.keys(objectives).length === 0 ? (
              <div className="py-4 text-center text-slate-500">No active objectives registered.</div>
            ) : (
              Object.values(objectives).map((obj) => (
                <div key={obj.id} className="bg-slate-950/60 p-3 rounded border border-slate-800 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-slate-200">{obj.id}</h5>
                    <p className="text-slate-400 text-[10px]">Title Key: {obj.titleKey}</p>
                    <p className="text-slate-400 text-[10px]">
                      Progress: <span className="text-cyan-400 font-bold">{obj.currentCount}</span> / {obj.targetCount}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${obj.completed ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-400 border border-amber-800"}`}>
                      {obj.completed ? "COMPLETED" : "IN PROGRESS"}
                    </span>
                    {!obj.completed && (
                      <button
                        onClick={() => handleCompleteObjective(obj.id)}
                        className="px-2 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[10px] font-bold"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* MODIFIERS TAB */}
        {activeTab === "modifiers" && (
          <div className="space-y-3">
            <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500">Evaluating Encounter:</span>{" "}
              <code className="text-cyan-300 font-bold">{currentEncounter.id} ({currentEncounter.gameId})</code>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="py-1">Modifier ID</th>
                  <th className="py-1">Target Property</th>
                  <th className="py-1 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {resolvedModifiers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-500">No active modifiers for current state.</td>
                  </tr>
                ) : (
                  resolvedModifiers.map((mod) => (
                    <tr key={mod.id} className="border-b border-slate-850 hover:bg-slate-800/30">
                      <td className="py-1.5 font-mono text-cyan-400">{mod.id}</td>
                      <td className="py-1.5 text-slate-300">{mod.targetProperty}</td>
                      <td className="py-1.5 text-right font-bold text-amber-300">{String(mod.value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-2">
            <h5 className="font-bold text-slate-400 border-b border-slate-800 pb-1">Visited Node Sequence ({history.length})</h5>
            <ol className="space-y-1 list-decimal list-inside text-slate-300 font-mono">
              {history.map((nodeId, idx) => (
                <li key={`${nodeId}_${idx}`} className={`p-1 rounded ${nodeId === currentNode?.id ? "bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold" : "hover:bg-slate-800/40"}`}>
                  {nodeId}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Footer / Status Bar */}
      <footer className="px-4 py-2 bg-slate-950 border-t border-slate-800 rounded-b-lg flex justify-between items-center text-[10px] text-slate-500">
        <div>TinyAster Narrative Introspection Suite</div>
        <div>Active: <span className="text-emerald-400 font-bold">{currentNode?.id || "None"}</span></div>
      </footer>
    </div>
  );
};
