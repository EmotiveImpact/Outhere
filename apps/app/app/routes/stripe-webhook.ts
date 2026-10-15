import { createClient } from "@supabase/supabase-js";
import type { Database } from "@outhere/core/supabase";
import { subscriptionRow, verifyStripeSignature } from "~/stripe-webhook.server";
import { supabaseUrl } from "~/supabase.server";
import type { Route } from "./+types/stripe-webhook";

/**
 * Stripe calls this when a web membership starts, renews, changes or ends.
 * In Stripe: Developers > Webhooks, add SITE_URL/webhooks/stripe with the
 * customer.subscription.created, .updated and .deleted events.
 * Writes with the service role key, which never leaves this server.
 */
export async function action({ request }: Route.ActionArgs) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!secret || !serviceKey || !supabaseUrl()) return new Response("Not set up", { status: 503 });

  const body = await request.text();
  if (!verifyStripeSignature(body, request.headers.get("stripe-signature"), secret)) return new Response("Bad signature", { status: 400 });

  const row = subscriptionRow(JSON.parse(body));
  // Events we don't keep still get a 200, or Stripe keeps sending them.
  if (!row) return new Response("Ignored", { status: 200 });

  const admin = createClient<Database>(supabaseUrl(), serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "provider_ref" });
  // A 500 makes Stripe try again later.
  if (error) return new Response("Could not save", { status: 500 });
  return new Response("Saved", { status: 200 });
}

export function loader() {
  return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
}
