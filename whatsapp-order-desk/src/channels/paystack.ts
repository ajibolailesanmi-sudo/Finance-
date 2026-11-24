import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentLinkRequest, PaymentProvider } from "../types.js";

/**
 * Paystack: create a payment page per order (POST /transaction/initialize) and
 * learn about successful payments from the charge.success webhook, double-checked
 * with GET /transaction/verify/:reference.
 */
export class PaystackPayments implements PaymentProvider {
  private readonly fetch: typeof fetch;

  constructor(private readonly opts: { secretKey: string; callbackUrl?: string; fetchImpl?: typeof fetch }) {
    this.fetch = opts.fetchImpl ?? fetch;
  }

  private headers() {
    return { Authorization: `Bearer ${this.opts.secretKey}`, "Content-Type": "application/json" };
  }

  async createPaymentLink(req: PaymentLinkRequest): Promise<{ url: string }> {
    const res = await this.fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        email: req.email,
        amount: req.amountKobo,
        currency: "NGN",
        reference: req.reference,
        ...(this.opts.callbackUrl ? { callback_url: this.opts.callbackUrl } : {}),
        metadata: { order_reference: req.reference, whatsapp: req.phone, customer_name: req.customerName ?? "" },
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data?.status || !data?.data?.authorization_url) {
      throw new Error(`Paystack initialize failed: ${res.status} ${data?.message ?? ""}`);
    }
    return { url: data.data.authorization_url as string };
  }

  /** Ask Paystack directly whether a reference was paid, and for how much. */
  async verify(reference: string): Promise<{ paid: boolean; amountKobo: number; currency: string }> {
    const res = await this.fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: this.headers(),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data?.status) throw new Error(`Paystack verify failed: ${res.status} ${data?.message ?? ""}`);
    return {
      paid: data.data?.status === "success",
      amountKobo: Number(data.data?.amount ?? 0),
      currency: String(data.data?.currency ?? ""),
    };
  }
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
export function verifyPaystackSignature(rawBody: Buffer, header: string | undefined, secretKey: string): boolean {
  if (!header) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody).digest();
  const given = Buffer.from(header, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export type PaystackCharge = { reference: string; amountKobo: number; currency: string; paidAt?: string };

/** Returns the successful charge in a webhook body, or undefined for other events. */
export function parsePaystackEvent(body: any): PaystackCharge | undefined {
  if (body?.event !== "charge.success" || !body?.data?.reference) return undefined;
  return {
    reference: String(body.data.reference),
    amountKobo: Number(body.data.amount ?? 0),
    currency: String(body.data.currency ?? "NGN"),
    paidAt: body.data.paid_at ? String(body.data.paid_at) : undefined,
  };
}
