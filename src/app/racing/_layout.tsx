import { Stack } from "expo-router";

export default function RacingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Micro Racers" }} />
    </Stack>
  );
}
