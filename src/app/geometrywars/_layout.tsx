import { Stack } from "expo-router";

export default function GeometryWarsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Geometry Wars" }} />
    </Stack>
  );
}
