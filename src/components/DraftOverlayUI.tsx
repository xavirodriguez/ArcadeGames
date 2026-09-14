import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MutatorRegistry, Rarity } from '../utils/MutatorRegistry';
import { hapticSelection } from '../utils/haptics';
import { colors, spacing, typography } from '../theme';

export interface DraftOverlayUIProps {
  options: string[];
  onSelectOption: (id: string) => void;
  visible?: boolean;
}

const RARITY_COLORS: Record<Rarity, string> = {
  COMMON: colors.cyan,
  RARE: colors.blue,
  EPIC: colors.magenta,
  LEGENDARY: colors.gold,
};

export const DraftOverlayUI: React.FC<DraftOverlayUIProps> = ({
  options,
  onSelectOption,
  visible = true,
}) => {
  if (!visible || !options || options.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card} accessibilityViewIsModal={true}>
        <Text style={styles.title} accessibilityRole="header">
          ⚡ DRAFT DE MUTADORES
        </Text>
        <Text style={styles.subtitle}>
          Selecciona una mejora para la siguiente oleada
        </Text>

        <ScrollView style={styles.optionsList}>
          {options.map((id) => {
            let name = id;
            let description = "";
            let rarity: Rarity = "COMMON";

            try {
              const meta = MutatorRegistry.get(id);
              if (meta) {
                name = meta.name;
                description = meta.description;
                rarity = meta.rarity;
              }
            } catch (_e) {
              // Fallback
            }

            const badgeColor = RARITY_COLORS[rarity] || colors.cyan;

            return (
              <TouchableOpacity
                key={id}
                style={[styles.optionCard, { borderColor: badgeColor }]}
                activeOpacity={0.8}
                onPress={() => {
                  hapticSelection();
                  onSelectOption(id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${name}, rareza ${rarity}. ${description}`}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionName}>{name}</Text>
                  <View style={[styles.rarityBadge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.rarityText}>{rarity}</Text>
                  </View>
                </View>
                <Text style={styles.optionDesc}>{description}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2500,
  },
  card: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 12,
    padding: spacing.xl,
  },
  title: {
    color: colors.cyan,
    fontSize: typography.sizes.xl,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontFamily: typography.game,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  optionsList: {
    flexGrow: 0,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  optionName: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
    flex: 1,
  },
  rarityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  rarityText: {
    color: colors.background,
    fontSize: typography.sizes.xs,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
  },
  optionDesc: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontFamily: typography.game,
  },
});
