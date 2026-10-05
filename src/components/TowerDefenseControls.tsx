import React, { FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { colors, spacing, typography } from "../theme";
import { hapticSelection } from "../utils/haptics";

interface TowerDefenseControlsProps {
  selectedTowerType: string;
  onSelectTower: (type: string) => void;
  onBuild: () => void;
  onSell: () => void;
  onUpgrade: () => void;
  onStartWave: () => void;
  phase?: string;
  gold: number;
}

const TOWERS = [
  { id: "basic", label: "Basic ($50)", cost: 50 },
  { id: "sniper", label: "Sniper ($100)", cost: 100 },
  { id: "rapid", label: "Rapid ($80)", cost: 80 },
  { id: "frost", label: "Frost ($75)", cost: 75 },
];

export const TowerDefenseControls: FC<TowerDefenseControlsProps> = ({
  selectedTowerType,
  onSelectTower,
  onBuild,
  onSell,
  onUpgrade,
  onStartWave,
  phase,
  gold,
}) => {
  const canStartWave = phase === "build" || phase === "intermission";

  return (
    <View style={styles.container}>
      <View style={styles.towerRow}>
        {TOWERS.map((t) => {
          const isSelected = selectedTowerType === t.id;
          const canAfford = gold >= t.cost;
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.towerButton,
                isSelected && styles.towerButtonSelected,
                !canAfford && styles.buttonDisabled,
              ]}
              onPress={() => {
                hapticSelection();
                onSelectTower(t.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Seleccionar torre ${t.label}`}
            >
              <Text
                style={[
                  styles.towerText,
                  isSelected && styles.towerTextSelected,
                  !canAfford && styles.textDisabled,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.buildButton]}
          onPress={() => {
            hapticSelection();
            onBuild();
          }}
          accessibilityRole="button"
          accessibilityLabel="Construir torre"
        >
          <Text style={styles.actionText}>CONSTRUIR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.upgradeButton]}
          onPress={() => {
            hapticSelection();
            onUpgrade();
          }}
          accessibilityRole="button"
          accessibilityLabel="Mejorar torre"
        >
          <Text style={styles.actionText}>MEJORAR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.sellButton]}
          onPress={() => {
            hapticSelection();
            onSell();
          }}
          accessibilityRole="button"
          accessibilityLabel="Vender torre"
        >
          <Text style={styles.actionText}>VENDER</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.waveButton,
            !canStartWave && styles.buttonDisabled,
          ]}
          disabled={!canStartWave}
          onPress={() => {
            hapticSelection();
            onStartWave();
          }}
          accessibilityRole="button"
          accessibilityLabel="Lanzar oleada"
        >
          <Text style={[styles.actionText, !canStartWave && styles.textDisabled]}>
            OLEADA ▶
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  towerRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.sm,
  },
  towerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  towerButtonSelected: {
    borderColor: colors.cyan,
    backgroundColor: "rgba(0, 240, 255, 0.2)",
  },
  towerText: {
    color: colors.white,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
  },
  towerTextSelected: {
    color: colors.cyan,
    fontWeight: "bold",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  buildButton: {
    backgroundColor: "#2e7d32",
  },
  upgradeButton: {
    backgroundColor: "#1565c0",
  },
  sellButton: {
    backgroundColor: "#c62828",
  },
  waveButton: {
    backgroundColor: "#f57f17",
  },
  actionText: {
    color: colors.white,
    fontFamily: typography.game,
    fontSize: typography.sizes.sm,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  textDisabled: {
    color: "rgba(255, 255, 255, 0.4)",
  },
});
