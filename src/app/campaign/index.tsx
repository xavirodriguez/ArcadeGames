import React from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { CampaignScreen } from "../../../components/CampaignScreen";
import { proofOfConceptStoryGraph } from "../../games/shared/story/ProofOfConceptStoryGraph";
import { BackButton } from "../../components/ui/BackButton";
import { spacing } from "../../theme";

export default function CampaignRoute() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
      </View>
      <CampaignScreen
        graph={proofOfConceptStoryGraph}
        slotId="poc_campaign_slot"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    zIndex: 100,
  },
});
