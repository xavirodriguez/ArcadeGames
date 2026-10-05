import { Stack } from "expo-router";

export default function BlindStationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Blind Station" }} />
    </Stack>
  );
}
