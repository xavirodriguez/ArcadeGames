import type { GestureResponderEvent } from "react-native";

declare module "react-native" {
  interface TouchableOpacityProps {
    onPointerMove?: ((event: GestureResponderEvent) => void) | undefined;
    onTouchMove?: ((event: GestureResponderEvent) => void) | undefined;
  }
}
