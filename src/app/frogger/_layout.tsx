import { Stack } from "expo-router";

export default function FroggerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Frogger" }} />
    </Stack>
  );
}
