import "react-native";

declare module "react-native" {
  interface TouchableOpacityProps {
    onPointerMove?: ((event: any) => void) | undefined;
    onTouchMove?: ((event: any) => void) | undefined;
  }
}
