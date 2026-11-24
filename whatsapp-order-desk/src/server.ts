import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { buildConnectors, buildDesk } from "./app.js";
import { parsePaystackEvent, verifyPaystackSignature, type PaystackCharge } from "./channels/paystack.js";
import { parseWhatsAppWebhook, verifyWhatsAppSignature } from "./channels/whatsapp.js";
import { loadConfig, type Config } from "./config.js";
import type { OrderDesk } from "./desk.js";

/**
 * HTTP endpoints:
 *   GET  /health               uptime check
 *   GET  /webhooks/whatsapp    Meta's webhook verification handshake
 *   POST /webhooks/whatsapp    incoming customer messages
 *   POST /webhooks/paystack    payment events
 *   GET  /paid                 page customers land on after paying
 */

const MAX_BODY = 1_000_000;

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: string, type = "text/plain; charset=utf-8"): void {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

export type ServerOptions = {
  /** Double-check a charge with Paystack before trusting it (production). */
  verifyCharge?: (reference: string) => Promise<{ paid: boolean; amountKobo: number; currency: string }>;
  log?: (msg: string) => void;
};

export function createDeskServer(desk: OrderDesk, config: Config, opts: ServerOptions = {}): Server {
  const log = opts.log ?? ((m: string) => console.log(m));
  const seen = new Set<string>(); // WhatsApp retries webhooks; skip messages already handled.

  if (!config.whatsapp.appSecret) log("[server] WHATSAPP_APP_SECRET is not set: WhatsApp webhooks are NOT signature-checked. Set it before going live.");

  const onWhatsApp = async (raw: Buffer, signature: string | undefined): Promise<number> => {
    if (config.whatsapp.appSecret && !verifyWhatsAppSignature(raw, signature, config.whatsapp.appSecret)) return 401;
    let body: unknown;
    try {
      body = JSON.parse(raw.toString("utf8"));
    } catch {
      return 400;
    }
    for (const msg of parseWhatsAppWebhook(body)) {
      if (seen.has(msg.id)) continue;
      seen.add(msg.id);
      if (seen.size > 5000) seen.delete(seen.values().next().value!);
      desk.handleInbound(msg).catch((err) => log(`[server] message ${msg.id} failed: ${(err as Error).stack ?? err}`));
    }
    return 200;
  };

  const onPaystack = async (raw: Buffer, signature: string | undefined): Promise<number> => {
    const secret = config.paystack.secretKey;
    if (!secret || !verifyPaystackSignature(raw, signature, secret)) return 401;
    let charge: PaystackCharge | undefined;
    try {
      charge = parsePaystackEvent(JSON.parse(raw.toString("utf8")));
    } catch {
      return 400;
    }
    if (!charge) return 200; // other events are acknowledged and ignored
    const c = charge;
    void (async () => {
      let confirmed = c;
      if (opts.verifyCharge) {
        const v = await opts.verifyCharge(c.reference);
        if (!v.paid) {
          log(`[server] Paystack says ${c.reference} is not paid; ignoring webhook.`);
          return;
        }
        confirmed = { ...c, amountKobo: v.amountKobo, currency: v.currency };
      }
      const outcome = await desk.handlePayment(confirmed);
      log(`[server] payment ${c.reference}: ${outcome}`);
    })().catch((err) => log(`[server] payment ${c.reference} failed: ${(err as Error).stack ?? err}`));
    return 200;
  };

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      if (req.method === "GET" && url.pathname === "/health") return send(res, 200, "ok");

      if (url.pathname === "/webhooks/whatsapp" && req.method === "GET") {
        const ok =
          url.searchParams.get("hub.mode") === "subscribe" &&
          Boolean(config.whatsapp.verifyToken) &&
          url.searchParams.get("hub.verify_token") === config.whatsapp.verifyToken;
        return ok ? send(res, 200, url.searchParams.get("hub.challenge") ?? "") : send(res, 403, "forbidden");
      }
      if (url.pathname === "/webhooks/whatsapp" && req.method === "POST") {
        const status = await onWhatsApp(await readBody(req), req.headers["x-hub-signature-256"] as string | undefined);
        return send(res, status, status === 200 ? "ok" : "rejected");
      }
      if (url.pathname === "/webhooks/paystack" && req.method === "POST") {
        const status = await onPaystack(await readBody(req), req.headers["x-paystack-signature"] as string | undefined);
        return send(res, status, status === 200 ? "ok" : "rejected");
      }
      if (req.method === "GET" && url.pathname === "/paid") {
        return send(
          res,
          200,
          `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment received</title><body style="font-family:system-ui;max-width:420px;margin:15vh auto;padding:0 20px;text-align:center"><h1>Thank you!</h1><p>Your payment is being confirmed. You'll get a message on WhatsApp in a moment.</p><p>You can close this page and return to WhatsApp.</p></body>`,
          "text/html; charset=utf-8",
        );
      }
      return send(res, 404, "not found");
    } catch (err) {
      log(`[server] ${req.method} ${url.pathname} failed: ${(err as Error).message}`);
      return send(res, 500, "error");
    }
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  const connectors = buildConnectors(config);
  const desk = buildDesk(config, connectors);
  const server = createDeskServer(desk, config, {
    verifyCharge: connectors.payments.verify?.bind(connectors.payments),
  });
  server.listen(config.port, () => {
    console.log(`[server] order desk for ${config.businessName} listening on :${config.port} (parser: ${connectors.parser.name})`);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
