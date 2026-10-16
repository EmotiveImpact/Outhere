import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // The workspace installs a flat node_modules for the phone app, which hoists
  // its older React to the root. Resolve React from this package everywhere.
  resolve: { dedupe: ["react", "react-dom"] },
  // Share the member app's images (/img/...) and favicon instead of copying them.
  publicDir: "../app/public",
  server: { port: 5174 },
  preview: { port: 5174 },
});
