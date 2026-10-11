import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EngineBridge, useProfile } from "@/data/hooks";
import { useStepSync } from "@/hooks/useStepSync";
import UpgradeSheet from "@/components/ui/UpgradeSheet";

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
    "ClashGrotesk-Bold": require("../../assets/fonts/ClashGrotesk-Bold.ttf"),
    "ClashGrotesk-Medium": require("../../assets/fonts/ClashGrotesk-Medium.ttf"),
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a0a0a" }, animation: "slide_from_right" }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ animation: "fade" }} />
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      </Stack>
      <StepSync />
      <UpgradeSheet />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
          <EngineBridge />
          <RootStack />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
