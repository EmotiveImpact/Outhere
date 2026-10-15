import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { planForPrice, subscriptionRow, verifyStripeSignature } from "../app/stripe-webhook.server";

const env = { STRIPE_PRICE_PRO_MONTHLY: "price_pm", STRIPE_PRICE_PRO_YEARLY: "price_py", STRIPE_PRICE_BLACK_MONTHLY: "price_bm", STRIPE_PRICE_BLACK_YEARLY: "price_by" };
const sign = (body: string, t: number, secret = "whsec_test") => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

describe("verifyStripeSignature", () => {
  const body = '{"id":"evt_1"}';
  const now = 1_760_000_000;
  it("accepts a fresh, correctly signed body", () => {
    expect(verifyStripeSignature(body, sign(body, now), "whsec_test", now)).toBe(true);
  });
  it("refuses a changed body, the wrong secret, an old event and no header", () => {
    expect(verifyStripeSignature(body + " ", sign(body, now), "whsec_test", now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, now, "other"), "whsec_test", now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, now - 301), "whsec_test", now)).toBe(false);
    expect(verifyStripeSignature(body, null, "whsec_test", now)).toBe(false);
  });
});

describe("subscriptionRow", () => {
  const sub = (over: object = {}) => ({
    id: "sub_1",
    status: "active",
    metadata: { user_id: "u1", club_id: "c1" },
    items: { data: [{ price: { id: "price_by" }, current_period_end: 1_790_000_000 }] },
    ...over,
  });

  it("maps a price to its plan", () => {
    expect(planForPrice("price_pm", env)).toEqual({ tier: "pro", yearly: false });
    expect(planForPrice("price_by", env)).toEqual({ tier: "black", yearly: true });
    expect(planForPrice("price_x", env)).toBeNull();
  });

  it("writes a web subscription with the club that brought them", () => {
    expect(subscriptionRow({ type: "customer.subscription.created", data: { object: sub() } }, env)).toEqual({
      user_id: "u1", tier: "black", source: "web", status: "active", provider_ref: "sub_1",
      referral_club_id: "c1", yearly: true, current_period_end: new Date(1_790_000_000_000).toISOString(),
    });
  });

  it("marks a deleted subscription cancelled", () => {
    expect(subscriptionRow({ type: "customer.subscription.deleted", data: { object: sub({ status: "canceled" }) } }, env)?.status).toBe("cancelled");
  });

  it("skips payments in progress, unknown prices and other events", () => {
    expect(subscriptionRow({ type: "customer.subscription.created", data: { object: sub({ status: "incomplete" }) } }, env)).toBeNull();
    expect(subscriptionRow({ type: "customer.subscription.updated", data: { object: sub({ items: { data: [{ price: { id: "price_x" }, current_period_end: 1 }] } }) } }, env)).toBeNull();
    expect(subscriptionRow({ type: "invoice.paid", data: { object: sub() } }, env)).toBeNull();
  });
});
