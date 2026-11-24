import { loadSampleCatalog } from "../src/app.js";
import { OrderDesk } from "../src/desk.js";
import { RulesParser } from "../src/parser/rules.js";
import type { MessageParser } from "../src/parser/types.js";
import { MemoryStore } from "../src/store/memory.js";
import type { Messenger, PaymentLinkRequest, PaymentProvider } from "../src/types.js";

export const CUSTOMER = "2348012345678";
export const STAFF = "2348000000001";

export function setup(opts: { parser?: MessageParser; failPayments?: boolean } = {}) {
  const store = new MemoryStore(loadSampleCatalog());
  const sent: { to: string; body: string }[] = [];
  const links: PaymentLinkRequest[] = [];
  const messenger: Messenger = {
    async sendText(to, body) {
      sent.push({ to, body });
    },
  };
  const payments: PaymentProvider = {
    async createPaymentLink(req) {
      if (opts.failPayments) throw new Error("paystack down");
      links.push(req);
      return { url: `https://pay.test/${req.reference}` };
    },
  };
  let n = 0;
  const desk = new OrderDesk({
    store,
    parser: opts.parser ?? new RulesParser(),
    messenger,
    payments,
    businessName: "Test Wholesale",
    staffNumbers: [STAFF],
    emailDomain: "orders.test",
    newReference: () => `OD-TEST-${++n}`,
    log: () => {},
  });
  let id = 0;
  const say = (text: string, from = CUSTOMER) => desk.handleInbound({ id: `m${++id}`, from, name: "Ada Okafor", kind: "text", text });
  const lastTo = (to: string) => [...sent].reverse().find((m) => m.to === to)?.body ?? "";
  return { store, desk, sent, links, say, lastTo };
}
