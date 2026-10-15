import { createHmac, timingSafeEqual } from "node:crypto";
import type { Tier } from "@outhere/core";
import type { Database } from "@outhere/core/supabase";

/*
 * Turns Stripe's subscription events into rows in `subscriptions`. The
 * database does the rest: the ring follows the best live subscription
 * (sync_tier) and the club fund is paid from those rows (credit_club_fund).
 */

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Insert"];

/** How old a signed event may be before it is refused, so a captured one can't be replayed later. */
const TOLERANCE_S = 300;

/** Checks the Stripe-Signature header against the raw body, as Stripe's own libraries do. */
export function verifyStripeSignature(body: string, header: string | null, secret: string, nowS = Math.floor(Date.now() / 1000)): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(t) || !signatures.length || Math.abs(nowS - t) > TOLERANCE_S) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${body}`).digest("hex"));
  return signatures.some((s) => {
    const given = Buffer.from(s);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** The plan a Stripe price id stands for, from the STRIPE_PRICE_* variables. */
export function planForPrice(priceId: string, env: Record<string, string | undefined> = process.env): { tier: Exclude<Tier, "free">; yearly: boolean } | null {
  for (const tier of ["pro", "black"] as const) {
    for (const yearly of [false, true]) {
      if (env[`STRIPE_PRICE_${tier.toUpperCase()}_${yearly ? "YEARLY" : "MONTHLY"}`] === priceId) return { tier, yearly };
    }
  }
  return null;
}

const STATUS: Record<string, SubscriptionRow["status"] | undefined> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  unpaid: "past_due",
  canceled: "cancelled",
  incomplete_expired: "expired",
  paused: "expired",
  // "incomplete" is left out: the first payment hasn't gone through yet.
};

interface StripeSubscription {
  id: string;
  status: string;
  metadata?: Record<string, string>;
  current_period_end?: number;
  items?: { data?: { price?: { id?: string }; current_period_end?: number }[] };
}

/**
 * The row to write for a customer.subscription.* event, or null when the
 * event isn't one we keep (an unknown price, a payment still in progress, a
 * subscription made outside Outhere's checkout).
 */
export function subscriptionRow(event: { type: string; data: { object: StripeSubscription } }, env: Record<string, string | undefined> = process.env): SubscriptionRow | null {
  if (!event.type.startsWith("customer.subscription.")) return null;
  const sub = event.data.object;
  const item = sub.items?.data?.[0];
  const plan = item?.price?.id ? planForPrice(item.price.id, env) : null;
  const userId = sub.metadata?.user_id;
  const status = event.type === "customer.subscription.deleted" ? "cancelled" : STATUS[sub.status];
  // Newer Stripe API versions keep the period on the item, older ones on the subscription.
  const end = item?.current_period_end ?? sub.current_period_end;
  if (!plan || !userId || !status || !end) return null;
  return {
    user_id: userId,
    tier: plan.tier,
    source: "web",
    status,
    provider_ref: sub.id,
    referral_club_id: sub.metadata?.club_id || null,
    yearly: plan.yearly,
    current_period_end: new Date(end * 1000).toISOString(),
  };
}
