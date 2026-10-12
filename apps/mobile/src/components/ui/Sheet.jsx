// Bottom sheet used across the app: dimmed backdrop, panel springs up from the
// bottom, drag handle, safe-area padding. Tap the backdrop to close.

import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Sheet({ visible, onClose, children, scroll = false, maxHeight = "88%", padded = true }) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {visible ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)" }}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(20).stiffness(220)}
            exiting={SlideOutDown.duration(200)}
            style={{
              maxHeight,
              backgroundColor: "#141416",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor: "#232326",
            }}
          >
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: "#3a3a40" }} />
            </View>
            <Body
              style={scroll ? undefined : { paddingHorizontal: padded ? 24 : 0 }}
              contentContainerStyle={scroll ? { paddingHorizontal: padded ? 24 : 0, paddingBottom: insets.bottom + 24 } : undefined}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
              {scroll ? null : <View style={{ height: insets.bottom + 24 }} />}
            </Body>
          </Animated.View>
        </KeyboardAvoidingView>
      ) : null}
    </Modal>
  );
}

export default Sheet;
