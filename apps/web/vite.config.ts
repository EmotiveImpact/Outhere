import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The workspace installs a flat node_modules for the phone app, which hoists
// its older React to the root. Resolve React from this package and bundle it
// into the server build, so the site and react-dom always share one copy.
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  build: { target: 'es2020', assetsInlineLimit: 0 },
  ssr: { noExternal: [/^@radix-ui\//, '@outhere/core', 'react', 'react-dom'] },
});
