import * as React from "react";
import type { MiniGameEncounter } from "@tiny-aster/core";

export interface ModifierInspectorProps {
  activeModifiers: Record<string, any>;
  modifierRules?: MiniGameEncounter["modifierRules"];
}

/**
 * Inspector component providing natural language explanations for active minigame modifiers
 * and encounter modifier rules.
 */
export const ModifierInspector: React.FC<ModifierInspectorProps> = ({
  activeModifiers,
  modifierRules,
}) => {
  const explainModifier = (key: string, value: any): string => {
    const explanations: Record<string, (v: any) => string> = {
      shieldMultiplier: (v) => `Escudos: ${(v * 100).toFixed(0)}% de potencia`,
      navigationAssist: (v) => `Asistencia de navegación: ${v ? "ACTIVADA" : "DESACTIVADA"}`,
      extraLives: (v) => `${v >= 0 ? "+" : ""}${v} vidas adicionales`,
      fireRateMultiplier: (v) => `Velocidad de disparo: ${(v * 100).toFixed(0)}%`,
      enemySpeedMultiplier: (v) => `Velocidad de enemigos: ${(v * 100).toFixed(0)}%`,
    };
    return explanations[key]?.(value) ?? `${key}: ${String(value)}`;
  };

  const modifierEntries = Object.entries(activeModifiers || {});

  return (
    <div className="modifier-inspector" style={{ marginTop: "12px", borderTop: "1px dashed #00ff00", paddingTop: "8px" }}>
      <h4 style={{ margin: "4px 0", color: "#00ff00", fontSize: "12px", textTransform: "uppercase" }}>
        Active Modifiers ({modifierEntries.length})
      </h4>
      {modifierEntries.length === 0 ? (
        <p style={{ margin: "2px 0", fontStyle: "italic", color: "#888888" }}>Sin modificadores activos</p>
      ) : (
        <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
          {modifierEntries.map(([key, value]) => (
            <li key={key} style={{ margin: "2px 0" }}>
              <strong style={{ color: "#00ffff" }}>{key}:</strong> {explainModifier(key, value)}
            </li>
          ))}
        </ul>
      )}

      {modifierRules && modifierRules.length > 0 && (
        <div style={{ marginTop: "8px" }}>
          <h4 style={{ margin: "4px 0", color: "#00ff00", fontSize: "12px", textTransform: "uppercase" }}>
            Modifier Rules (Encounter)
          </h4>
          <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
            {modifierRules.map((rule, idx) => (
              <li key={rule.id || idx} style={{ margin: "4px 0", fontSize: "10px" }}>
                <span style={{ color: "#ffff00" }}>{rule.modifier.name || rule.id}:</span>{" "}
                <code>Rule: {rule.modifier.targetProperty} = {String(rule.modifier.value)}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
