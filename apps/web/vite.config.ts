import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  resolve: { tsconfigPaths: true },
  server: { port: 5173 },
  ssr: {
    // Workspace packages ship TypeScript source, so Vite compiles them.
    noExternal: ["@outhere/core", "@outhere/ui"],
  },
});
