import "../styles/globals.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";
import { GameServicesProvider, configureNativeAudioMode } from "@tiny-aster/react-native";
import { AudioSettingsService } from "../services/AudioSettingsService";
import { Platform, View, ActivityIndicator, Text } from "react-native";

export default function RootLayout() {
  const [skiaReady, setSkiaReady] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS !== "web") {
      configureNativeAudioMode().catch(() => {});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { LoadSkiaWeb } = await import("@shopify/react-native-skia/lib/module/web");
        await LoadSkiaWeb();
      } catch (e) {
        console.warn("[RootLayout] LoadSkiaWeb failed or not required:", e);
      } finally {
        if (!cancelled) setSkiaReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!skiaReady) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#00F0FF" />
        <Text style={{ color: "#fff", marginTop: 16, fontFamily: "monospace" }}>Loading CanvasKit...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      <GameServicesProvider audioService={AudioSettingsService}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ title: "Arcade" }} />
          <Stack.Screen name="asteroids" options={{ title: "Asteroides" }} />
          <Stack.Screen name="space-invaders" options={{ title: "Space Invaders" }} />
          <Stack.Screen name="flappybird" options={{ title: "Flappy Bird" }} />
          <Stack.Screen name="pong" options={{ title: "Pong" }} />
          <Stack.Screen name="platformer" options={{ title: "Platformer" }} />
          <Stack.Screen name="arkanoid" options={{ title: "Arkanoid" }} />
          <Stack.Screen name="geometrywars" options={{ title: "Geometry Wars" }} />
          <Stack.Screen name="echorunner" options={{ title: "Echo Runner" }} />
          <Stack.Screen name="frogger" options={{ title: "Frogger" }} />
          <Stack.Screen name="campaign" options={{ title: "Campaign" }} />
          <Stack.Screen name="cyoa" options={{ title: "Choose Your Own Adventure" }} />
          <Stack.Screen name="blindstation" options={{ title: "Blind Station" }} />
          <Stack.Screen name="hitandrun" options={{ title: "Hit and Run" }} />
          <Stack.Screen name="racing" options={{ title: "Micro Racers" }} />
          <Stack.Screen name="outrun" options={{ title: "Out Run" }} />
          <Stack.Screen name="vertical-shmup" options={{ title: "1942 // Vertical Shmup" }} />
          <Stack.Screen name="tower-defense" options={{ title: "Tower Defense" }} />
        </Stack>
      </GameServicesProvider>
    </GestureHandlerRootView>
  );
}
