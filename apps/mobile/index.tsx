import 'react-native-url-polyfill/auto';
global.Buffer = require('buffer').Buffer;

import '@expo/metro-runtime';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import App from './entrypoint';

renderRootComponent(App);
