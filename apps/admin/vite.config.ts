import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Share the member app's images (/img/...) and favicon instead of copying them.
  publicDir: "../app/public",
  server: { port: 5174 },
  preview: { port: 5174 },
});
