import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { setCustomText, setCustomTextInput } from 'react-native-global-props';
import { useThemeStore } from '../src/store/themeStore';

export default function RootLayout() {
  const { colors, loadTheme } = useThemeStore();
  const [fontsLoaded] = useFonts({
    SwitzerRegular: require('../assets/fonts/Switzer-Regular.ttf'),
    SwitzerMedium: require('../assets/fonts/Switzer-Medium.ttf'),
    SwitzerSemibold: require('../assets/fonts/Switzer-Semibold.ttf'),
    SwitzerBold: require('../assets/fonts/Switzer-Bold.ttf'),
  });

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  useEffect(() => {
    if (!fontsLoaded) return;

    setCustomText({
      style: {
        fontFamily: 'SwitzerRegular',
      },
    });
    setCustomTextInput({
      style: {
        fontFamily: 'SwitzerRegular',
      },
    });
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
