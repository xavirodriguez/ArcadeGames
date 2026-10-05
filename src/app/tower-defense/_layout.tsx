import { Stack } from "expo-router";

export default function TowerDefenseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Tower Defense" }} />
    </Stack>
  );
}
