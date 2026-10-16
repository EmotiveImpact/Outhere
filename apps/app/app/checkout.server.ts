import type { Tier } from "@outhere/core";

/**
 * Starts a Stripe Checkout session for Pro or Black and returns its URL.
 * Needs STRIPE_SECRET_KEY and a price id per plan and period, for example
 * STRIPE_PRICE_PRO_MONTHLY. The club being backed and the person paying go in
 * the metadata, so the Stripe webhook can set the tier and pay the club its share.
 */
export async function startCheckout(input: { tier: Tier; yearly: boolean; clubId: string; userId: string; origin: string }): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env[`STRIPE_PRICE_${input.tier.toUpperCase()}_${input.yearly ? "YEARLY" : "MONTHLY"}`];
  if (input.tier === "free") throw new Error("NOTHING_TO_PAY");
  if (!key || !price) throw new Error("CHECKOUT_NOT_SET_UP");

  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${input.origin}/membership?joined=1`,
    cancel_url: `${input.origin}/membership`,
    client_reference_id: input.userId,
    "metadata[club_id]": input.clubId,
    "metadata[channel]": "web",
    "subscription_data[metadata][club_id]": input.clubId,
    "subscription_data[metadata][user_id]": input.userId,
    "automatic_tax[enabled]": "true",
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !json.url) throw new Error(json.error?.message ?? "CHECKOUT_FAILED");
  return json.url;
}
