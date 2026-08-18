import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet
} from "react-native";
import {
  MiniGameEncounterDSL,
  OutcomeRuleEngine,
  SemanticValidator,
  SemanticValidationContext,
  MiniGameResult,
  StoryEffect,
  MiniGameOutcomeRule,
  ModifierRule
} from "@tiny-aster/core";
import { colors } from "../theme/colors";

export interface EncounterRuleEditorProps {
  initialEncounter?: MiniGameEncounterDSL;
  validationContext?: SemanticValidationContext;
  onSave?: (encounter: MiniGameEncounterDSL) => void;
  onClose?: () => void;
}

/**
 * Full Visual Authoring Tool & DEV Encounter Editor with GUI Rule Builder.
 *
 * @remarks
 * Enables authors to visually create, edit, duplicate, delete, validate, export, and import encounters and rules
 * without manual JSON editing. Features a live Simulation Panel powered by production OutcomeRuleEngine.
 */
export const EncounterRuleEditor: React.FC<EncounterRuleEditorProps> = ({
  initialEncounter,
  validationContext = {},
  onSave,
  onClose
}) => {
  const [encounter, setEncounter] = useState<MiniGameEncounterDSL>(
    initialEncounter || {
      schemaVersion: 1,
      contentVersion: "1.0.0",
      id: "new_encounter_01",
      gameId: "asteroids",
      baseConfig: { difficulty: "normal", targetScore: 1000 },
      modifierRules: [],
      outcomeRules: []
    }
  );

  const [importJsonText, setImportJsonText] = useState<string>("");
  const [exportJsonText, setExportJsonText] = useState<string | null>(null);

  // Live Simulation Inputs
  const [simScore, setSimScore] = useState<string>("1000");
  const [simCompleted, setSimCompleted] = useState<boolean>(true);
  const [simDurationMs, setSimDurationMs] = useState<string>("30000");
  const [simCollisions, setSimCollisions] = useState<string>("0");
  const [simSecret, setSimSecret] = useState<string>("");

  // Live Simulation Outputs
  const [matchedEffects, setMatchedEffects] = useState<StoryEffect[]>([]);

  // Validation
  const semanticErrors = SemanticValidator.validate(encounter, validationContext);

  const handleRunSimulation = () => {
    const engine = new OutcomeRuleEngine();
    const result: MiniGameResult = {
      runId: "sim_run",
      gameId: encounter.gameId,
      score: parseInt(simScore, 10) || 0,
      completed: simCompleted,
      durationMs: parseInt(simDurationMs, 10) || 0,
      metrics: {
        collisions: parseInt(simCollisions, 10) || 0
      },
      secretsFound: simSecret.trim() ? [simSecret.trim()] : []
    };

    const effects = engine.evaluate(result, (encounter.outcomeRules || []) as any);
    setMatchedEffects(effects);
  };

  const handleAddOutcomeRule = () => {
    const newRule: any = {
      id: `rule_${Date.now().toString(36)}`,
      priority: ((encounter.outcomeRules?.length || 0) + 1) * 10,
      condition: { field: "completed", operator: "==", value: true },
      effects: [
        { type: "setFlag", key: "new_flag", value: true }
      ]
    };

    setEncounter({
      ...encounter,
      outcomeRules: [...(encounter.outcomeRules || []), newRule]
    });
  };

  const handleDuplicateRule = (ruleId: string) => {
    const target = encounter.outcomeRules?.find((r) => r.id === ruleId);
    if (!target) return;

    const duplicated: any = {
      ...JSON.parse(JSON.stringify(target)),
      id: `${target.id}_copy_${Math.random().toString(36).substring(2, 6)}`
    };

    setEncounter({
      ...encounter,
      outcomeRules: [...(encounter.outcomeRules || []), duplicated]
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    setEncounter({
      ...encounter,
      outcomeRules: (encounter.outcomeRules || []).filter((r) => r.id !== ruleId)
    });
  };

  const handleAddModifierRule = () => {
    const newModRule: any = {
      id: `mod_${Date.now().toString(36)}`,
      conditionFlag: "lowPower",
      modifier: {
        id: "m_shield_penalty",
        targetProperty: "shieldMultiplier",
        value: 0.5
      }
    };

    setEncounter({
      ...encounter,
      modifierRules: [...(encounter.modifierRules || []), newModRule]
    });
  };

  const handleExportJson = () => {
    setExportJsonText(JSON.stringify(encounter, null, 2));
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (parsed && typeof parsed === "object" && parsed.id && parsed.gameId) {
        setEncounter(parsed);
        setExportJsonText(null);
      }
    } catch {
      // Invalid JSON
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ENCOUNTER & RULE AUTHORING EDITOR</Text>
        <View style={styles.headerBtnRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportJson}>
            <Text style={styles.exportBtnText}>EXPORT JSON</Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close Editor">
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.contentScroll}>
        {/* Import/Export JSON Overlay Box */}
        {exportJsonText !== null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>EXPORTED ENCOUNTER JSON</Text>
            <TextInput
              style={[styles.textInput, { height: 120 }]}
              multiline
              value={exportJsonText}
              editable={false}
            />
            <TouchableOpacity style={styles.addBtn} onPress={() => setExportJsonText(null)}>
              <Text style={styles.addBtnText}>CLOSE EXPORT</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>IMPORT ENCOUNTER JSON</Text>
          <TextInput
            style={[styles.textInput, { height: 60 }]}
            multiline
            placeholder="Paste JSON here..."
            placeholderTextColor={colors.textSecondary}
            value={importJsonText}
            onChangeText={setImportJsonText}
          />
          <TouchableOpacity style={[styles.addBtn, { marginTop: 6 }]} onPress={handleImportJson}>
            <Text style={styles.addBtnText}>IMPORT</Text>
          </TouchableOpacity>
        </View>

        {/* Encounter Basic Metadata */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ENCOUNTER METADATA</Text>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Encounter ID:</Text>
            <TextInput
              style={styles.textInput}
              value={encounter.id}
              onChangeText={(text) => setEncounter({ ...encounter, id: text })}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Game ID:</Text>
            <TextInput
              style={styles.textInput}
              value={encounter.gameId}
              onChangeText={(text) => setEncounter({ ...encounter, gameId: text })}
            />
          </View>
        </View>

        {/* Semantic Validation Results */}
        {semanticErrors.length > 0 && (
          <View style={styles.validationCard}>
            <Text style={styles.cardTitle}>SEMANTIC VALIDATION ISSUES</Text>
            {semanticErrors.map((err, idx) => (
              <Text key={idx} style={err.severity === "error" ? styles.errorText : styles.warnText}>
                [{err.severity.toUpperCase()}] {err.message}
              </Text>
            ))}
          </View>
        )}

        {/* Modifier Rules */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>MODIFIER RULES ({encounter.modifierRules?.length || 0})</Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddModifierRule}>
              <Text style={styles.addBtnText}>+ ADD MODIFIER RULE</Text>
            </TouchableOpacity>
          </View>

          {encounter.modifierRules?.map((modRule, idx) => (
            <View key={modRule.id || idx} style={styles.ruleCard}>
              <Text style={styles.ruleIdText}>Mod Rule: {modRule.id}</Text>
              <Text style={styles.ruleSubText}>Condition Flag: {modRule.conditionFlag || "N/A"}</Text>
              <Text style={styles.ruleSubText}>
                Target: {modRule.modifier.targetProperty} = {String(modRule.modifier.value)}
              </Text>
            </View>
          ))}
        </View>

        {/* Outcome Rules List & GUI Rule Builder */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>OUTCOME RULES ({encounter.outcomeRules?.length || 0})</Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddOutcomeRule}>
              <Text style={styles.addBtnText}>+ ADD OUTCOME RULE</Text>
            </TouchableOpacity>
          </View>

          {encounter.outcomeRules?.map((rule, idx) => (
            <View key={rule.id || idx} style={styles.ruleCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.ruleIdText}>Rule: {rule.id}</Text>
                <View style={styles.headerBtnRow}>
                  <TouchableOpacity onPress={() => handleDuplicateRule(rule.id)} style={{ marginRight: 8 }}>
                    <Text style={styles.duplicateText}>DUPLICATE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteRule(rule.id)}>
                    <Text style={styles.deleteText}>DELETE</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.ruleSubText}>Priority: {rule.priority}</Text>
              <Text style={styles.ruleSubText}>
                Condition: {JSON.stringify(rule.condition)}
              </Text>
              <Text style={styles.ruleSubText}>
                Effects: {JSON.stringify(rule.effects)}
              </Text>
            </View>
          ))}
        </View>

        {/* Live Simulation Panel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>LIVE SIMULATION PANEL</Text>
          <Text style={styles.simSubText}>
            Test outcome rules in real-time using production OutcomeRuleEngine:
          </Text>

          <View style={styles.inputRow}>
            <Text style={styles.label}>Score:</Text>
            <TextInput
              style={styles.textInput}
              value={simScore}
              onChangeText={setSimScore}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.label}>Completed:</Text>
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => setSimCompleted(!simCompleted)}
            >
              <Text style={styles.toggleBtnText}>{simCompleted ? "TRUE" : "FALSE"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.label}>Collisions (Metric):</Text>
            <TextInput
              style={styles.textInput}
              value={simCollisions}
              onChangeText={setSimCollisions}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.label}>Found Secret ID:</Text>
            <TextInput
              style={styles.textInput}
              value={simSecret}
              onChangeText={setSimSecret}
              placeholder="e.g. black_box_fragment"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <TouchableOpacity style={styles.simRunBtn} onPress={handleRunSimulation}>
            <Text style={styles.simRunBtnText}>EVALUATE RULES</Text>
          </TouchableOpacity>

          <View style={styles.simResultCard}>
            <Text style={styles.simResultTitle}>MATCHED STORY EFFECTS ({matchedEffects.length}):</Text>
            <Text style={styles.codeText}>{JSON.stringify(matchedEffects, null, 2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Save Row */}
      {onSave && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => onSave(encounter)}
          >
            <Text style={styles.saveBtnText}>SAVE ENCOUNTER</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 20, 0.95)",
    borderWidth: 1,
    borderColor: colors.cyan,
    borderRadius: 8,
    padding: 12,
    margin: 8
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cyan,
    paddingBottom: 8
  },
  title: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  headerBtnRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  exportBtn: {
    backgroundColor: colors.pink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8
  },
  exportBtnText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  closeBtn: {
    padding: 4
  },
  closeBtnText: {
    color: colors.pink,
    fontSize: 18,
    fontWeight: "bold"
  },
  contentScroll: {
    flex: 1
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  cardTitle: {
    color: colors.pink,
    fontSize: 13,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 8
  },
  validationCard: {
    backgroundColor: "rgba(255, 0, 85, 0.1)",
    borderWidth: 1,
    borderColor: colors.pink,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12
  },
  errorText: {
    color: colors.pink,
    fontSize: 11,
    fontFamily: "monospace"
  },
  warnText: {
    color: colors.gold,
    fontSize: 11,
    fontFamily: "monospace"
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  label: {
    color: colors.white,
    fontSize: 12,
    fontFamily: "monospace",
    width: 140
  },
  textInput: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 1,
    borderColor: colors.textSecondary,
    color: colors.cyan,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "monospace"
  },
  addBtn: {
    backgroundColor: colors.cyan,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  addBtnText: {
    color: colors.backgroundDark,
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  ruleCard: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 8,
    borderRadius: 4,
    marginTop: 6
  },
  ruleIdText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  duplicateText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  deleteText: {
    color: colors.pink,
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  ruleSubText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: "monospace",
    marginTop: 2
  },
  simSubText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: "monospace",
    marginBottom: 8
  },
  toggleBtn: {
    backgroundColor: colors.cyan,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4
  },
  toggleBtnText: {
    color: colors.backgroundDark,
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  simRunBtn: {
    backgroundColor: colors.pink,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 8
  },
  simRunBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  simResultCard: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 8,
    borderRadius: 4,
    marginTop: 8
  },
  simResultTitle: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  codeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: "monospace",
    marginTop: 4
  },
  footer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cyan,
    paddingTop: 8
  },
  saveBtn: {
    backgroundColor: colors.cyan,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: "center"
  },
  saveBtnText: {
    color: colors.backgroundDark,
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "monospace"
  }
});
