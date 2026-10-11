import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import App from './App';

LoadSkiaWeb().then(() => {
  renderRootComponent(App);
});
