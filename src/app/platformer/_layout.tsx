import { Stack } from "expo-router";

export default function PlatformerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Platformer" }} />
    </Stack>
  );
}
