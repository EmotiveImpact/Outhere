import type { Config } from "@react-router/dev/config";

export default {
  // Server-rendered so public club pages, the join flow and Outhere Locals are
  // quick to open from a QR scan and findable by search engines.
  ssr: true,
  // Send the full route list with the first page, rather than fetching it
  // later from /__manifest, so pages served through the website need nothing extra.
  routeDiscovery: { mode: "initial" },
} satisfies Config;
