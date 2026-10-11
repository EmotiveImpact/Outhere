const fs = require('fs');
const path = require('path');

const duplicatePaths = [
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
