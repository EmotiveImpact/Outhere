import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: { target: 'es2020', assetsInlineLimit: 0 },
  ssr: { noExternal: [/^@radix-ui\//] },
});
