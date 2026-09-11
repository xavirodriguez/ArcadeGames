import { Stack } from "expo-router";

export default function ArkanoidLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Arkanoid" }} />
    </Stack>
  );
}
