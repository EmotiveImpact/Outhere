import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "@outhere/ui/app.css";
import { router } from "./App";
import { AuthGate } from "./Auth";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthGate>
      <RouterProvider router={router} />
    </AuthGate>
  </StrictMode>,
);
