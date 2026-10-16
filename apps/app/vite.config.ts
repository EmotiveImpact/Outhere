import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  // The workspace installs a flat node_modules for the phone app, which hoists
  // its older React to the root. Resolve React from this package everywhere.
  resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom", "react-router"] },
  server: { port: 5173 },
  // weouthere.app is the website, which passes every path it doesn't own to
  // this app. A folder name the website will never use keeps the two apart.
  build: { assetsDir: "_app" },
  ssr: {
    // Workspace packages ship TypeScript source, so Vite compiles them.
    // React and React Router are bundled too, so the server render and
    // react-dom always share this app's copy of React.
    noExternal: ["@outhere/core", "@outhere/ui", "react", "react-dom", "react-router"],
  },
});
