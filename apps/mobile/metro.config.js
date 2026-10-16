const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const WEB_ALIASES = {
  'expo-secure-store': path.resolve(__dirname, './polyfills/web/secureStore.web.ts'),
  'react-native-webview': path.resolve(__dirname, './polyfills/web/webview.web.tsx'),
  'react-native-safe-area-context': path.resolve(
    __dirname,
    './polyfills/web/safeAreaContext.web.jsx'
  ),
  'react-native-maps': path.resolve(__dirname, './polyfills/web/maps.web.jsx'),
  'react-native-web/dist/exports/SafeAreaView': path.resolve(
    __dirname,
    './polyfills/web/SafeAreaView.web.jsx'
  ),
  'react-native-web/dist/exports/Alert': path.resolve(__dirname, './polyfills/web/alerts.web.tsx'),
  'react-native-web/dist/exports/RefreshControl': path.resolve(
    __dirname,
    './polyfills/web/refreshControl.web.tsx'
  ),
  'expo-status-bar': path.resolve(__dirname, './polyfills/web/statusBar.web.tsx'),
  'expo-location': path.resolve(__dirname, './polyfills/web/location.web.ts'),
  './layouts/Tabs': path.resolve(__dirname, './polyfills/web/tabbar.web.jsx'),
  'expo-notifications': path.resolve(__dirname, './polyfills/web/notifications.web.tsx'),
  'expo-contacts/legacy': path.resolve(__dirname, './polyfills/web/contacts.web.ts'),
  'expo-font': path.resolve(__dirname, './polyfills/web/expo-font.web.ts'),
  'react-native-web/dist/exports/ScrollView': path.resolve(
    __dirname,
    './polyfills/web/scrollview.web.jsx'
  ),
};
const NATIVE_ALIASES = {
  './Libraries/Components/TextInput/TextInput': path.resolve(
    __dirname,
    './polyfills/native/texinput.native.jsx'
  ),
};
const SHARED_ALIASES = {
  'expo-image': path.resolve(__dirname, './polyfills/shared/expo-image.tsx'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Polyfills import the real modules, so don't alias inside them
  if (
    context.originModulePath.startsWith(`${__dirname}/polyfills/native`) ||
    context.originModulePath.startsWith(`${__dirname}/polyfills/web`) ||
    context.originModulePath.startsWith(`${__dirname}/polyfills/shared`)
  ) {
    return context.resolveRequest(context, moduleName, platform);
  }
  // Wildcard alias for Expo Google Fonts
  if (moduleName.startsWith('@expo-google-fonts/') && moduleName !== '@expo-google-fonts/dev') {
    return context.resolveRequest(context, '@expo-google-fonts/dev', platform);
  }
  if (SHARED_ALIASES[moduleName]) {
    return context.resolveRequest(context, SHARED_ALIASES[moduleName], platform);
  }
  if (platform === 'web') {
    if (WEB_ALIASES[moduleName]) {
      return context.resolveRequest(context, WEB_ALIASES[moduleName], platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  }
  if (NATIVE_ALIASES[moduleName]) {
    return context.resolveRequest(context, NATIVE_ALIASES[moduleName], platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
