import { Stack } from "expo-router";

export default function VerticalShmupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "1942 // Vertical Shmup" }} />
    </Stack>
  );
}
