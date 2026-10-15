import type { Config } from "@react-router/dev/config";

export default {
  // Server-rendered so public club pages, the join flow and Outhere Locals are
  // quick to open from a QR scan and findable by search engines.
  ssr: true,
} satisfies Config;
