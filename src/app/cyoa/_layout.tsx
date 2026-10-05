import { Stack } from "expo-router";

export default function CYOALayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Choose Your Own Adventure" }} />
    </Stack>
  );
}
