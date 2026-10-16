import { createBrowserRouter, Navigate } from "react-router";
import { Shell } from "./Shell";
import { Overview } from "./pages/Overview";
import { Verify } from "./pages/Verify";
import { FairPlay } from "./pages/FairPlay";
import { Seasons } from "./pages/Seasons";
import { AuditLog } from "./pages/AuditLog";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <Overview /> },
      { path: "verify", element: <Verify /> },
      { path: "fair-play", element: <FairPlay /> },
      { path: "seasons", element: <Seasons /> },
      { path: "audit", element: <AuditLog /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
