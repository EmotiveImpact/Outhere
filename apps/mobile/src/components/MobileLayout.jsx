import { useRef } from "react";
import { Animated, Platform, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

export default function MobileLayout({ children, isTabScreen = false }) {
  const insets = useSafeAreaInsets();
  const focusedPadding = 12;

  const paddingAnimation = useRef(
    new Animated.Value(insets.bottom + focusedPadding),
  ).current;

  const animateTo = (value) => {
    Animated.timing(paddingAnimation, {
      toValue: value,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleInputFocus = () => {
    if (Platform.OS === "web" || isTabScreen) return;
    animateTo(focusedPadding);
  };

  const handleInputBlur = () => {
    if (Platform.OS === "web" || isTabScreen) return;
    animateTo(insets.bottom + focusedPadding);
  };

  return (
    <KeyboardAvoidingAnimatedView
      style={{ flex: 1, backgroundColor: "#0a0a0a" }}
      behavior="padding"
    >
      <Animated.View
        style={{ flex: 1, paddingBottom: isTabScreen ? 0 : paddingAnimation }}
      >
        {children}
      </Animated.View>
    </KeyboardAvoidingAnimatedView>
  );
}
