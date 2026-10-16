import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  resolve: { tsconfigPaths: true },
  server: { port: 5173 },
  // weouthere.app is the website, which passes every path it doesn't own to
  // this app. A folder name the website will never use keeps the two apart.
  build: { assetsDir: "_app" },
  ssr: {
    // Workspace packages ship TypeScript source, so Vite compiles them.
    noExternal: ["@outhere/core", "@outhere/ui"],
  },
});
