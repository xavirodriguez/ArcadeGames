import * as React from "react";
import { useState, useEffect } from "react";
import type { StoryRuntime, MiniGameEncounter, MiniGameResult, StoryEffect } from "@tiny-aster/core";
import { ModifierInspector } from "./ModifierInspector";

export interface NarrativeDashboardProps {
  storyRuntime: StoryRuntime | null;
  isVisible?: boolean;
  onToggle?: () => void;
  activeModifiers?: Record<string, unknown>;
  modifierRules?: MiniGameEncounter["modifierRules"];
  lastResult?: MiniGameResult | null;
  lastAppliedEffects?: StoryEffect[] | null;
}

interface ValueHolder {
  value?: unknown;
}

/**
 * React debugging and live monitoring widget for StoryRuntime narrative state and active modifiers.
 */
export const NarrativeDashboard: React.FC<NarrativeDashboardProps> = ({
  storyRuntime,
  isVisible = true,
  onToggle,
  activeModifiers = {},
  modifierRules,
  lastResult,
  lastAppliedEffects,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!storyRuntime) return;
    const interval = setInterval(() => {
      setVersion((v) => v + 1);
    }, 250);
    return () => clearInterval(interval);
  }, [storyRuntime]);

  if (!isVisible || !storyRuntime) {
    return null;
  }

  const currentNode = storyRuntime.getCurrentNode();
  const snapshot = storyRuntime.getStateSnapshot();
  const timeline = storyRuntime.getTimeline().recent(10);

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "420px",
    maxHeight: expanded ? "600px" : "48px",
    backgroundColor: "rgba(10, 15, 10, 0.95)",
    border: "2px solid #00ff00",
    borderRadius: "6px",
    color: "#00ff00",
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "11px",
    overflowY: "auto",
    padding: "10px",
    zIndex: 99999,
    boxShadow: "0 0 15px rgba(0, 255, 0, 0.3)",
    transition: "max-height 0.3s ease-in-out"
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: expanded ? "1px solid #00ff00" : "none",
    paddingBottom: "6px",
    marginBottom: expanded ? "8px" : "0",
    cursor: "pointer"
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: "#003300",
    border: "1px solid #00ff00",
    color: "#00ff00",
    fontFamily: "inherit",
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: "3px",
    cursor: "pointer"
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    margin: "6px 0 10px 0"
  };

  const cellStyle: React.CSSProperties = {
    border: "1px solid rgba(0, 255, 0, 0.3)",
    padding: "3px 6px",
    textAlign: "left"
  };

  return (
    <div className="narrative-dashboard" style={containerStyle}>
      <div style={headerStyle} onClick={() => setExpanded(!expanded)}>
        <span style={{ fontWeight: "bold", fontSize: "12px", letterSpacing: "1px" }}>
          📖 NARRATIVE RUNTIME DASHBOARD
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button style={buttonStyle} onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? "MINIMIZE" : "EXPAND"}
          </button>
          {onToggle && (
            <button style={buttonStyle} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
              CLOSE
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          {/* Current Node */}
          <section style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "2px 0 4px 0", color: "#00ffff", fontSize: "11px", textTransform: "uppercase" }}>
              Active Node
            </h4>
            <div style={{ paddingLeft: "8px", borderLeft: "2px solid #00ffff" }}>
              <div><strong>ID:</strong> {currentNode?.id || "N/A"}</div>
              <div><strong>Type:</strong> {currentNode?.type || "N/A"}</div>
              <div><strong>Title:</strong> {currentNode?.title || "N/A"}</div>
            </div>
          </section>

          {/* Flags */}
          <section style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "2px 0 4px 0", color: "#00ffff", fontSize: "11px", textTransform: "uppercase" }}>
              Flags ({Object.keys(snapshot.flags).length})
            </h4>
            {Object.keys(snapshot.flags).length === 0 ? (
              <span style={{ color: "#888888", fontStyle: "italic" }}>No flags set</span>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(0, 255, 0, 0.1)" }}>
                    <th style={cellStyle}>Key</th>
                    <th style={cellStyle}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(snapshot.flags).map(([k, item]) => {
                    const itemObj = item as ValueHolder;
                    const flagVal = typeof item === "object" && item !== null && "value" in itemObj ? itemObj.value : item;
                    return (
                      <tr key={k}>
                        <td style={cellStyle}>{k}</td>
                        <td style={{ ...cellStyle, color: flagVal ? "#00ff00" : "#ff5555" }}>
                          {String(flagVal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* Variables */}
          <section style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "2px 0 4px 0", color: "#00ffff", fontSize: "11px", textTransform: "uppercase" }}>
              Variables ({Object.keys(snapshot.variables).length})
            </h4>
            {Object.keys(snapshot.variables).length === 0 ? (
              <span style={{ color: "#888888", fontStyle: "italic" }}>No variables set</span>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(0, 255, 0, 0.1)" }}>
                    <th style={cellStyle}>Key</th>
                    <th style={cellStyle}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(snapshot.variables).map(([k, item]) => {
                    const itemObj = item as ValueHolder;
                    const varVal = typeof item === "object" && item !== null && "value" in itemObj ? itemObj.value : item;
                    return (
                      <tr key={k}>
                        <td style={cellStyle}>{k}</td>
                        <td style={{ ...cellStyle, color: "#ffff00" }}>{String(varVal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* Timeline Events */}
          <section style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "2px 0 4px 0", color: "#00ffff", fontSize: "11px", textTransform: "uppercase" }}>
              Recent Events ({timeline.length})
            </h4>
            {timeline.length === 0 ? (
              <span style={{ color: "#888888", fontStyle: "italic" }}>No events recorded</span>
            ) : (
              <ol style={{ margin: "4px 0", paddingLeft: "16px", fontSize: "10px" }}>
                {timeline.map((evt, idx) => (
                  <li key={idx} style={{ margin: "3px 0" }}>
                    <span style={{ color: "#00ff00" }}>{evt.type}</span>{" "}
                    <span style={{ color: "#888888" }}>@{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    {evt.payload && (
                      <pre style={{ margin: "2px 0 0 0", color: "#aaaaaa", fontSize: "9px" }}>
                        {JSON.stringify(evt.payload)}
                      </pre>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Last MiniGame Result */}
          <section style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "2px 0 4px 0", color: "#00ffff", fontSize: "11px", textTransform: "uppercase" }}>
              Last MiniGame Result
            </h4>
            {!lastResult ? (
              <span style={{ color: "#888888", fontStyle: "italic" }}>No minigame run recorded</span>
            ) : (
              <div style={{ paddingLeft: "8px", borderLeft: "2px solid #00ffff" }}>
                <div><strong>Game ID:</strong> {lastResult.gameId}</div>
                <div><strong>Score:</strong> {lastResult.score}</div>
                <div><strong>Completed:</strong> <span style={{ color: lastResult.completed ? "#00ff00" : "#ff5555" }}>{String(lastResult.completed)}</span></div>
                <div><strong>Duration:</strong> {lastResult.durationMs} ms</div>
                <div><strong>Secrets Found:</strong> {lastResult.secretsFound.length > 0 ? lastResult.secretsFound.join(", ") : "None"}</div>
                {lastResult.metrics && Object.keys(lastResult.metrics).length > 0 && (
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ backgroundColor: "rgba(0, 255, 0, 0.1)" }}>
                        <th style={cellStyle}>Metric</th>
                        <th style={cellStyle}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(lastResult.metrics).map(([mKey, mVal]) => (
                        <tr key={mKey}>
                          <td style={cellStyle}>{mKey}</td>
                          <td style={{ ...cellStyle, color: "#ffff00" }}>{String(mVal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>

          {/* Last Applied Effects */}
          <section style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "2px 0 4px 0", color: "#00ffff", fontSize: "11px", textTransform: "uppercase" }}>
              Last Applied Effects ({lastAppliedEffects?.length ?? 0})
            </h4>
            {!lastAppliedEffects || lastAppliedEffects.length === 0 ? (
              <span style={{ color: "#888888", fontStyle: "italic" }}>No narrative effects applied yet</span>
            ) : (
              <ol style={{ margin: "4px 0", paddingLeft: "16px", fontSize: "10px" }}>
                {lastAppliedEffects.map((eff, idx) => (
                  <li key={idx} style={{ margin: "3px 0", color: "#ff88ff" }}>
                    <strong>{eff.type}:</strong>{" "}
                    {"key" in eff ? `${eff.key} = ${"value" in eff ? String(eff.value) : "amount" in eff ? String(eff.amount) : ""}` : ""}
                    {"evidenceId" in eff ? eff.evidenceId : ""}
                    {"objectiveId" in eff ? eff.objectiveId : ""}
                    {"nodeId" in eff ? eff.nodeId : ""}
                    {"event" in eff ? eff.event : ""}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Active Modifiers Inspector */}
          <ModifierInspector activeModifiers={activeModifiers} modifierRules={modifierRules} />
        </>
      )}
    </div>
  );
};
