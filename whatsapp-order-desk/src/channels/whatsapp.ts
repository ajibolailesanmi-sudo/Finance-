import { createHmac, timingSafeEqual } from "node:crypto";
import type { InboundKind, InboundMessage, Messenger } from "../types.js";

/**
 * WhatsApp Cloud API (Meta). Inbound messages arrive on a webhook; replies are
 * sent with POST /{phone-number-id}/messages.
 *
 * Free-form replies are allowed within 24 hours of the customer's last message,
 * which is always the case here because the desk only replies to customers.
 * Staff alerts follow the same rule: a staff number receives alerts only if it
 * messaged the business number in the last 24 hours (see README).
 */

export class WhatsAppCloudMessenger implements Messenger {
  constructor(
    private readonly opts: { token: string; phoneNumberId: string; graphVersion: string; fetchImpl?: typeof fetch },
  ) {}

  async sendText(to: string, body: string): Promise<void> {
    const f = this.opts.fetchImpl ?? fetch;
    const res = await f(`https://graph.facebook.com/${this.opts.graphVersion}/${this.opts.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.opts.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: true, body: body.slice(0, 4096) },
      }),
    });
    if (!res.ok) throw new Error(`WhatsApp send to ${to} failed: ${res.status} ${await res.text()}`);
  }
}

/** Check Meta's X-Hub-Signature-256 header ("sha256=<hex>") against the raw request body. */
export function verifyWhatsAppSignature(rawBody: Buffer, header: string | undefined, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const given = Buffer.from(header.slice("sha256=".length), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const KIND: Record<string, InboundKind> = {
  text: "text",
  button: "text",
  interactive: "text",
  image: "image",
  sticker: "image",
  document: "document",
  audio: "audio",
  voice: "audio",
  video: "video",
  location: "location",
};

/** Pull customer messages out of a webhook payload. Delivery/read status updates are ignored. */
export function parseWhatsAppWebhook(body: any): InboundMessage[] {
  const out: InboundMessage[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      if (!value?.messages) continue;
      const names = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c?.wa_id && c?.profile?.name) names.set(String(c.wa_id), String(c.profile.name));
      }
      for (const m of value.messages) {
        if (!m?.id || !m?.from) continue;
        const kind = KIND[m.type] ?? "other";
        let text: string | undefined;
        if (m.type === "text") text = m.text?.body;
        else if (m.type === "button") text = m.button?.text;
        else if (m.type === "interactive") text = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title;
        else if (m.type === "image" || m.type === "document") text = m[m.type]?.caption;
        out.push({ id: String(m.id), from: String(m.from), name: names.get(String(m.from)), kind, text });
      }
    }
  }
  return out;
}
