import { createInterface } from "node:readline";
import { buildParser, loadSampleCatalog } from "./app.js";
import { loadConfig } from "./config.js";
import { OrderDesk } from "./desk.js";
import { naira, toKobo } from "./money.js";
import { MemoryStore } from "./store/memory.js";
import type { Messenger, PaymentProvider } from "./types.js";

/**
 * Chat with the desk in your terminal, as a customer, with no WhatsApp or
 * Paystack account. Uses Claude if ANTHROPIC_API_KEY is set, otherwise the
 * keyword parser.
 *
 *   npm run simulate
 *
 * Commands: /pay  /stock  /orders  /staff <#command>  /reset  /quit
 */

const CUSTOMER = "2348012345678";
const STAFF = "2348000000001";

const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

async function main(): Promise<void> {
  const config = loadConfig({ ...process.env, STAFF_WHATSAPP_NUMBERS: STAFF });
  let store = new MemoryStore(loadSampleCatalog());
  const parser = buildParser(config);

  const messenger: Messenger = {
    async sendText(to, body) {
      const label = to === STAFF ? yellow("STAFF ALERT ←") : cyan("DESK ←");
      console.log(`\n${label}\n${body}\n`);
    },
  };
  const payments: PaymentProvider = {
    async createPaymentLink(req) {
      return { url: `https://checkout.paystack.com/demo-${req.reference.toLowerCase()} (${naira(req.amountKobo / 100)}, demo link)` };
    },
  };

  const makeDesk = () =>
    new OrderDesk({
      store,
      parser,
      messenger,
      payments,
      businessName: process.env.BUSINESS_NAME ?? "Mama Ngozi Wholesale (demo)",
      staffNumbers: [STAFF],
      emailDomain: config.paystack.emailDomain,
      log: (m) => console.log(dim(m)),
    });
  let desk = makeDesk();

  console.log(`WhatsApp order desk simulator. Reading messages with: ${parser.name}.`);
  console.log(dim("Type as the customer. Commands: /pay /stock /orders /staff <#command> /reset /quit\n"));

  const rl = createInterface({ input: process.stdin, terminal: false });
  const prompt = () => process.stdout.write("YOU → ");
  prompt();
  for await (const raw of rl) {
    const line = raw.trim();
    if (!process.stdin.isTTY && line) console.log(line);
    await handle(line);
    if (line === "/quit") break;
    prompt();
  }
  rl.close();

  async function handle(line: string): Promise<void> {
    if (!line || line === "/quit") return;
    if (line === "/reset") {
      store = new MemoryStore(loadSampleCatalog());
      desk = makeDesk();
      console.log(dim("Fresh start.\n"));
      return;
    }
    if (line === "/stock") {
      for (const p of await store.listProducts()) console.log(dim(`${p.sku.padEnd(12)} ${String(p.stock).padStart(4)} × ${p.unit}  ${naira(p.price)}`));
      return;
    }
    if (line === "/orders") {
      for (const o of await store.listOrders()) console.log(dim(`${o.reference}  ${o.status.padEnd(16)} ${naira(o.total)}`));
      return;
    }
    if (line === "/pay") {
      const waiting = (await store.listOrders()).filter((o) => o.status === "awaiting_payment").at(-1);
      if (!waiting) {
        console.log(dim("No order is waiting for payment.\n"));
        return;
      }
      console.log(dim(`Simulating a Paystack payment of ${naira(waiting.total)} for ${waiting.reference}...`));
      await desk.handlePayment({ reference: waiting.reference, amountKobo: toKobo(waiting.total), currency: "NGN" });
      return;
    }
    if (line.startsWith("/staff ")) {
      await desk.handleInbound({ id: `sim-${Date.now()}`, from: STAFF, kind: "text", text: line.slice(7) });
      return;
    }
    await desk.handleInbound({ id: `sim-${Date.now()}`, from: CUSTOMER, name: "Ada Okafor", kind: "text", text: line });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
