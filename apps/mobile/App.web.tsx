import { App } from 'expo-router/build/qualified-entry';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import { AlertModal } from './polyfills/web/alerts.web';
import './global.css';

const WebApp = () => (
  <>
    <SafeAreaProvider
      initialMetrics={{
        insets: { top: 64, bottom: 34, left: 0, right: 0 },
        frame: {
          x: 0,
          y: 0,
          width: typeof window === 'undefined' ? 390 : window.innerWidth,
          height: typeof window === 'undefined' ? 844 : window.innerHeight,
        },
      }}
    >
      <App />
      <Toaster />
    </SafeAreaProvider>
    <AlertModal />
  </>
);

export default WebApp;
