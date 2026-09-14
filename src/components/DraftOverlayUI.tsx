import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MutatorRegistry } from "../utils/MutatorRegistry";
import { colors } from "../theme/colors";

export interface DraftOverlayUIProps {
  options: string[];
  onSelect: (mutatorId: string) => void;
  visible?: boolean;
}

export const DraftOverlayUI: React.FC<DraftOverlayUIProps> = ({ options, onSelect, visible = true }) => {
  if (!visible || !options || options.length === 0) return null;

  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>SELECCIONA UN MUTADOR</Text>
      <Text style={styles.subtitle}>Elige una mejora para tu siguiente oleada</Text>

      <View style={styles.cardContainer}>
        {options.map((id) => {
          let mutator;
          try {
            mutator = MutatorRegistry.get(id);
          } catch {
            mutator = { name: id, description: "Mejora especial", rarity: "COMMON" };
          }

          const rarityColor =
            mutator.rarity === "LEGENDARY"
              ? colors.gold
              : mutator.rarity === "EPIC"
              ? colors.magentaHot
              : mutator.rarity === "RARE"
              ? colors.cyan
              : colors.green;

          return (
            <TouchableOpacity
              key={id}
              style={[styles.card, { borderColor: rarityColor }]}
              onPress={() => onSelect(id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.rarity, { color: rarityColor }]}>{mutator.rarity}</Text>
              <Text style={styles.cardTitle}>{mutator.name}</Text>
              <Text style={styles.cardDescription}>{mutator.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 14, 39, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.cyan,
    letterSpacing: 2,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#AAAAAA",
    marginBottom: 24,
    textAlign: "center",
  },
  cardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    maxWidth: 600,
  },
  card: {
    backgroundColor: "rgba(20, 28, 58, 0.95)",
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
    width: 170,
    alignItems: "center",
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  rarity: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 12,
    color: "#CCCCCC",
    textAlign: "center",
    lineHeight: 16,
  },
});
