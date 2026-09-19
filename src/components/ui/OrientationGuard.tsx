import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { colors } from "../../theme/colors";

export interface OrientationGuardProps {
  children: React.ReactNode;
}

/**
 * OrientationGuard enforces landscape mode across Native (iOS/Android) and Web platforms.
 *
 * @remarks
 * On Native devices, locks screen orientation to LANDSCAPE_RIGHT on mount and unlocks on unmount.
 * On Web and touch devices, detects portrait orientation and renders a full-screen blocking overlay
 * requesting the player to rotate their device to landscape mode.
 *
 * @public
 */
export const OrientationGuard: React.FC<OrientationGuardProps> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Native iOS/Android orientation lock
    if (Platform.OS === "ios" || Platform.OS === "android") {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT).catch(() => {});
    }

    // Web / Responsive portrait check
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mediaQuery = window.matchMedia("(orientation: portrait)");

      const checkOrientation = () => {
        if (!isMounted) return;
        const portrait = mediaQuery.matches || (typeof window.innerHeight === "number" && typeof window.innerWidth === "number" && window.innerHeight > window.innerWidth);
        setIsPortrait(portrait);
      };

      checkOrientation();

      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", checkOrientation);
      }
      window.addEventListener("resize", checkOrientation);

      return () => {
        isMounted = false;
        if (typeof mediaQuery.removeEventListener === "function") {
          mediaQuery.removeEventListener("change", checkOrientation);
        }
        window.removeEventListener("resize", checkOrientation);

        if (Platform.OS === "ios" || Platform.OS === "android") {
          ScreenOrientation.unlockAsync().catch(() => {});
        }
      };
    }

    return () => {
      isMounted = false;
      if (Platform.OS === "ios" || Platform.OS === "android") {
        ScreenOrientation.unlockAsync().catch(() => {});
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {children}
      {isPortrait && (
        <View style={styles.blockingOverlay} pointerEvents="auto">
          <View style={styles.messageBox}>
            <Text style={styles.rotateIcon}>📱🔄</Text>
            <Text style={styles.titleText}>ORIENTATION GUARD</Text>
            <Text style={styles.messageText}>
              Please rotate your device to landscape mode to play.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "relative",
  },
  blockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 16, 15, 0.96)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: 24,
  },
  messageBox: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    maxWidth: 420,
    width: "100%",
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 20,
  },
  rotateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  titleText: {
    color: colors.cyan,
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: "center",
  },
  messageText: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
