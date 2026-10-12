// Lightweight toasts for confirming actions ("Checked in", "Joined the crew").
// Call toast("Saved") or toast.success("+20 XP") from anywhere; <ToastHost />
// is mounted once at the root.

import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Info, TriangleAlert } from "lucide-react-native";
import { create } from "zustand";
import { hapticError, hapticSuccess } from "@/services/haptics";

const useToasts = create((set) => ({
  items: [],
  // Modals cover the root host, so while any is open the topmost modal's own
  // host shows toasts instead (see ModalToastHost).
  modals: 0,
  addModal: () => set((s) => ({ modals: s.modals + 1 })),
  removeModal: () => set((s) => ({ modals: Math.max(0, s.modals - 1) })),
  push: (item) => set((s) => ({ items: [...s.items.slice(-2), item] })),
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

let counter = 0;
const show = (tone, title, body) => {
  const id = ++counter;
  if (tone === "success") hapticSuccess();
  if (tone === "error") hapticError();
  useToasts.getState().push({ id, tone, title, body });
  setTimeout(() => useToasts.getState().remove(id), tone === "error" ? 3600 : 2600);
};

export const toast = (title, body) => show("info", title, body);
toast.success = (title, body) => show("success", title, body);
toast.error = (title, body) => show("error", title, body);

const TONES = {
  success: { icon: Check, fg: "#04140b", bg: "#00ff7f" },
  info: { icon: Info, fg: "#ffffff", bg: "#1c1c1f" },
  error: { icon: TriangleAlert, fg: "#ffffff", bg: "#3a1513" },
};

/** Put inside any full-screen Modal so toasts fired there stay visible. */
export function ModalToastHost() {
  const addModal = useToasts((s) => s.addModal);
  const removeModal = useToasts((s) => s.removeModal);
  useEffect(() => {
    addModal();
    return removeModal;
  }, [addModal, removeModal]);
  return <ToastHost inModal />;
}

export function ToastHost({ inModal = false }) {
  const items = useToasts((s) => s.items);
  const covered = useToasts((s) => s.modals > 0);
  const insets = useSafeAreaInsets();
  if (!inModal && covered) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, gap: 8, zIndex: 1000 }}>
      {items.map((t) => {
        const tone = TONES[t.tone] || TONES.info;
        const Icon = tone.icon;
        return (
          <Animated.View
            key={t.id}
            entering={FadeInUp.springify().damping(16)}
            exiting={FadeOutUp.duration(180)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              alignSelf: "center",
              maxWidth: 420,
              backgroundColor: tone.bg,
              borderRadius: 999,
              paddingVertical: 10,
              paddingLeft: 12,
              paddingRight: 18,
              shadowColor: "#000",
              shadowOpacity: 0.4,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <Icon size={18} color={tone.fg} />
            <View style={{ flexShrink: 1 }}>
              <Text style={{ color: tone.fg, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>
                {t.title}
              </Text>
              {t.body ? (
                <Text style={{ color: tone.fg, opacity: 0.8, fontSize: 12 }} numberOfLines={2}>
                  {t.body}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}
