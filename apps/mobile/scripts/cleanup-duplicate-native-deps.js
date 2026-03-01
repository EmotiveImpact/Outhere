const fs = require('fs');
const path = require('path');

const duplicatePaths = [
  'node_modules/@anythingai/app/node_modules/@expo/vector-icons',
  'node_modules/@anythingai/app/node_modules/@expo/fingerprint',
  'node_modules/@anythingai/app/node_modules/expo',
  'node_modules/@anythingai/app/node_modules/expo-blur',
  'node_modules/@anythingai/app/node_modules/expo-clipboard',
  'node_modules/@anythingai/app/node_modules/expo-file-system',
  'node_modules/@anythingai/app/node_modules/expo-font',
  'node_modules/@anythingai/app/node_modules/expo-glass-effect',
  'node_modules/@anythingai/app/node_modules/expo-haptics',
  'node_modules/@anythingai/app/node_modules/expo-image',
  'node_modules/@anythingai/app/node_modules/expo-image-picker',
  'node_modules/@anythingai/app/node_modules/expo-linear-gradient',
  'node_modules/@anythingai/app/node_modules/expo-secure-store',
  'node_modules/@anythingai/app/node_modules/expo-status-bar',
  'node_modules/@anythingai/app/node_modules/expo-video',
  'node_modules/@anythingai/app/node_modules/expo-web-browser',
  'node_modules/@teovilla/react-native-web-maps/node_modules/expo-location',
  'node_modules/react-native-calendars/node_modules/react-native-safe-area-context',
];

for (const relPath of duplicatePaths) {
  const fullPath = path.join(__dirname, '..', relPath);
  try {
    fs.rmSync(fullPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`[cleanup-duplicate-native-deps] Failed to remove ${relPath}: ${error.message}`);
  }
}
