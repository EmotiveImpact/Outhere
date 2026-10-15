import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from "@expo-google-fonts/barlow-condensed";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EngineBridge, useProfile } from "@/data/hooks";
import { useStepSync } from "@/hooks/useStepSync";
import UpgradeSheet from "@/components/ui/UpgradeSheet";
import { ToastHost } from "@/components/ui/Toast";
import LaunchScreen from "@/components/ui/LaunchScreen";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Counts steps once the player has a profile.
function StepSync() {
  const { data: profile } = useProfile();
  useStepSync(!!profile);
  return null;
}

function RootStack() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  // Wait for the stored profile too, so app/index.jsx routes correctly first time.
  const { isPending } = useProfile();
  const isReady = fontsLoaded && !isPending;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#07090c" }, animation: "slide_from_right" }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ animation: "fade" }} />
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
        <Stack.Screen name="stories/[authorId]" options={{ animation: "fade", presentation: "fullScreenModal", contentStyle: { backgroundColor: "#000" } }} />
        <Stack.Screen name="stories/new" options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }} />
        <Stack.Screen name="membership/checkout" options={{ animation: "slide_from_bottom", presentation: "fullScreenModal", contentStyle: { backgroundColor: "#000" } }} />
        <Stack.Screen name="membership/welcome" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="stories/club/[crewId]" options={{ animation: "fade", presentation: "fullScreenModal", contentStyle: { backgroundColor: "#000" } }} />
        <Stack.Screen name="stories/share/[fixtureId]" options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }} />
      </Stack>
      <StepSync />
      <UpgradeSheet />
      <ToastHost />
      <LaunchScreen />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#07090c" }}>
          <EngineBridge />
          <RootStack />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
