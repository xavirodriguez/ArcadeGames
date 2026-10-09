import { Stack } from "expo-router";

export default function OutrunLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Out Run" }} />
    </Stack>
  );
}
