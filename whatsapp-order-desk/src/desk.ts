import { randomBytes } from "node:crypto";
import { naira, toKobo } from "./money.js";
import type { MessageParser, ParsedMessage } from "./parser/types.js";
import { isNo, isYes } from "./parser/rules.js";
import { KeyedQueue } from "./queue.js";
import type { Store } from "./store/types.js";
import type { Conversation, InboundMessage, Messenger, Order, OrderLine, PaymentProvider, Product } from "./types.js";

/**
 * The order desk: one WhatsApp conversation per customer, moving through
 *
 *   idle → awaiting_confirmation → (awaiting_address) → awaiting_payment → idle
 *
 * Claude (or the keyword parser) only reads messages. Prices, totals, stock
 * checks and every reply are decided here in code, so the bot cannot invent a
 * price. Anything it should not handle (complaints, haggling, receipts,
 * repeated confusion) is handed to a person.
 */

export type DeskDeps = {
  store: Store;
  parser: MessageParser;
  messenger: Messenger;
  payments: PaymentProvider;
  businessName: string;
  staffNumbers: string[];
  /** Paystack needs an email; customers get wa<phone>@<emailDomain>. */
  emailDomain: string;
  now?: () => Date;
  newReference?: () => string;
  log?: (msg: string) => void;
};

export type PaymentOutcome = "paid" | "duplicate" | "unknown" | "mismatch";

const HISTORY_LIMIT = 12;
const MAX_MISUNDERSTOOD = 2;

export function defaultReference(now = new Date()): string {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const tail = [...randomBytes(4)].map((b) => alphabet[b % alphabet.length]).join("");
  return `OD-${d}-${tail}`;
}

function lineText(l: OrderLine): string {
  return `• ${l.qty} × ${l.name} (${l.unit}) — ${naira(l.lineTotal)}`;
}

function listWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export class OrderDesk {
  private readonly queue = new KeyedQueue();
  private readonly now: () => Date;
  private readonly newReference: () => string;
  private readonly log: (msg: string) => void;

  constructor(private readonly d: DeskDeps) {
    this.now = d.now ?? (() => new Date());
    this.newReference = d.newReference ?? (() => defaultReference(this.now()));
    this.log = d.log ?? ((m) => console.log(m));
  }

  // ---------------------------------------------------------------------------
  // Inbound WhatsApp messages
  // ---------------------------------------------------------------------------

  handleInbound(msg: InboundMessage): Promise<void> {
    if (this.d.staffNumbers.includes(msg.from) && msg.text?.trim().startsWith("#")) {
      return this.queue.run(`staff:${msg.from}`, () => this.handleStaffCommand(msg.from, msg.text!.trim()));
    }
    return this.queue.run(msg.from, () => this.processInbound(msg));
  }

  private async processInbound(msg: InboundMessage): Promise<void> {
    const conv = (await this.d.store.getConversation(msg.from)) ?? this.newConversation(msg.from);
    if (msg.name) conv.name = msg.name;
    const text = (msg.text ?? "").trim();
    conv.history.push({ role: "customer", text: text || `[${msg.kind}]`, at: this.now().toISOString() });
    try {
      await this.route(conv, msg, text);
    } finally {
      conv.history = conv.history.slice(-HISTORY_LIMIT);
      conv.updatedAt = this.now().toISOString();
      await this.d.store.saveConversation(conv);
    }
  }

  private async route(conv: Conversation, msg: InboundMessage, text: string): Promise<void> {
    if (conv.needsHuman) {
      await this.alertStaff(`💬 ${this.who(conv)} wrote (waiting for a person):\n${text || `[${msg.kind}]`}`);
      return;
    }
    if (msg.kind === "image" || msg.kind === "document") {
      const what = msg.kind === "image" ? "a picture" : "a document";
      await this.handoff(conv, `Sent ${what}${text ? ` with the note "${text}"` : ""}. It may be a payment receipt or a product photo.`);
      return;
    }
    if (msg.kind !== "text" || !text) {
      await this.say(
        conv,
        `Sorry, I can only read typed messages for now. Please type your order, for example: "2 cartons of noodles and 1 bag of rice".`,
      );
      return;
    }

    const products = await this.d.store.listProducts();
    const pending = conv.orderRef ? await this.d.store.getOrder(conv.orderRef) : undefined;

    // Short replies to a summary don't need the model.
    if (pending && conv.state === "awaiting_confirmation" && isYes(text)) return this.confirm(conv, pending, products);
    if (pending && (conv.state === "awaiting_confirmation" || conv.state === "awaiting_address") && isNo(text)) {
      return this.cancel(conv, pending);
    }
    if (/^(agent|human|person|customer care)$/i.test(text)) {
      return this.handoff(conv, "Asked to talk to a person.");
    }

    const parsed = await this.d.parser.parse(text, {
      products,
      state: conv.state,
      pendingOrder: pending,
      history: conv.history.slice(0, -1),
    });
    this.log(`[desk] ${conv.phone} "${text}" → ${parsed.intent} ${JSON.stringify(parsed.items)}`);
    if (parsed.intent !== "other") conv.misunderstood = 0;

    switch (parsed.intent) {
      case "order":
        return this.draftOrder(conv, parsed, products, pending);
      case "product_question":
        return this.answerQuestion(conv, parsed, products);
      case "greeting":
        return this.say(conv, this.welcome(conv, products));
      case "confirm":
        if (pending && conv.state === "awaiting_confirmation") return this.confirm(conv, pending, products);
        if (pending && conv.state === "awaiting_payment" && pending.paymentUrl) {
          return this.say(conv, `Your order ${pending.reference} is waiting for payment. You can pay here:\n${pending.paymentUrl}`);
        }
        return this.say(conv, this.howToOrder());
      case "decline":
        if (pending && (pending.status === "draft" || pending.status === "awaiting_payment")) return this.cancel(conv, pending);
        return this.say(conv, "No problem. Message me any time you'd like to order.");
      case "address":
        return this.takeAddress(conv, parsed.address || text, pending, products);
      case "payment_claim":
        return this.paymentClaim(conv, pending);
      case "human":
        return this.handoff(conv, `Needs help: "${text}"`);
      default: {
        conv.misunderstood += 1;
        if (conv.misunderstood >= MAX_MISUNDERSTOOD) {
          return this.handoff(conv, `The desk could not understand: "${text}"`);
        }
        return this.say(
          conv,
          `Sorry, I didn't quite get that. ${this.howToOrder()}\n\nYou can also ask for prices, or type AGENT to talk to a person.`,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Ordering
  // ---------------------------------------------------------------------------

  private async draftOrder(conv: Conversation, parsed: ParsedMessage, products: Product[], pending?: Order): Promise<void> {
    if (parsed.address) conv.lastAddress = parsed.address;
    const bySku = new Map(products.map((p) => [p.sku, p]));

    if (!parsed.items.length) {
      if (parsed.unmatched.length) {
        return this.say(
          conv,
          `Sorry, we don't have ${listWords(parsed.unmatched.map((u) => `"${u}"`))} on our list.\n\n${this.catalogText(products)}`,
        );
      }
      return this.say(conv, this.howToOrder());
    }

    const lines: OrderLine[] = [];
    const problems: string[] = [];
    for (const it of parsed.items) {
      const p = bySku.get(it.sku);
      if (!p || !p.active) problems.push(`we don't stock "${it.sku}"`);
      else if (p.stock <= 0) problems.push(`${p.name} is out of stock right now`);
      else if (it.qty > p.stock) problems.push(`we only have ${p.stock} × ${p.unit} of ${p.name} left`);
      else lines.push({ sku: p.sku, name: p.name, unit: p.unit, qty: it.qty, unitPrice: p.price, lineTotal: p.price * it.qty });
    }
    if (parsed.unmatched.length) {
      problems.push(`I couldn't find ${listWords(parsed.unmatched.map((u) => `"${u}"`))} on our list`);
    }

    if (problems.length) {
      const canDo = lines.length ? `\n\nI can do:\n${lines.map(lineText).join("\n")}` : "";
      const sentence = problems.map((p) => p[0].toUpperCase() + p.slice(1)).join(". ");
      return this.say(conv, `${sentence}.${canDo}\n\nPlease tell me what you'd like instead.`);
    }

    if (pending && (pending.status === "draft" || pending.status === "awaiting_payment")) {
      pending.status = "cancelled";
      pending.note = "Replaced by a newer order from the same customer.";
      await this.d.store.saveOrder(pending);
    }

    const order: Order = {
      reference: this.newReference(),
      phone: conv.phone,
      customerName: conv.name,
      lines,
      total: lines.reduce((s, l) => s + l.lineTotal, 0),
      address: parsed.address || conv.lastAddress,
      status: "draft",
      createdAt: this.now().toISOString(),
    };
    await this.d.store.saveOrder(order);
    conv.orderRef = order.reference;
    conv.state = "awaiting_confirmation";

    const next = order.address
      ? `Deliver to: ${order.address}\n\nReply YES to confirm, or tell me what to change.`
      : `Reply YES to confirm, or tell me what to change. I'll ask for your delivery address next.`;
    await this.say(conv, `Here's your order:\n${lines.map(lineText).join("\n")}\n\nTotal: ${naira(order.total)}\n${next}`);
  }

  private async confirm(conv: Conversation, order: Order, products: Product[]): Promise<void> {
    if (!order.address) {
      conv.state = "awaiting_address";
      return this.say(conv, "Great! What's the delivery address? Please include the area and a nearby landmark.");
    }
    return this.requestPayment(conv, order, products);
  }

  private async takeAddress(conv: Conversation, address: string, pending: Order | undefined, products: Product[]): Promise<void> {
    conv.lastAddress = address;
    if (pending && (conv.state === "awaiting_address" || conv.state === "awaiting_confirmation")) {
      pending.address = address;
      await this.d.store.saveOrder(pending);
      if (conv.state === "awaiting_address") return this.requestPayment(conv, pending, products);
      return this.say(conv, `Got it, we'll deliver to: ${address}\n\nTotal: ${naira(pending.total)}. Reply YES to confirm.`);
    }
    return this.say(conv, `Thanks, I've saved that address. ${this.howToOrder()}`);
  }

  private async requestPayment(conv: Conversation, order: Order, products: Product[]): Promise<void> {
    if (order.paymentUrl && order.status === "awaiting_payment") {
      conv.state = "awaiting_payment";
      return this.say(conv, `You can pay for order ${order.reference} here:\n${order.paymentUrl}`);
    }

    // Stock may have moved since the summary was sent.
    const bySku = new Map(products.map((p) => [p.sku, p]));
    const short = order.lines.filter((l) => (bySku.get(l.sku)?.stock ?? 0) < l.qty);
    if (short.length) {
      order.status = "cancelled";
      order.note = "Stock ran out before payment.";
      await this.d.store.saveOrder(order);
      conv.state = "idle";
      conv.orderRef = undefined;
      return this.say(
        conv,
        `Sorry, ${listWords(short.map((l) => l.name))} just sold out before I could reserve it. Please send your order again and I'll check what's available.`,
      );
    }

    let url: string;
    try {
      ({ url } = await this.d.payments.createPaymentLink({
        reference: order.reference,
        amountKobo: toKobo(order.total),
        email: `wa${conv.phone}@${this.d.emailDomain}`,
        phone: conv.phone,
        customerName: conv.name,
      }));
    } catch (err) {
      this.log(`[desk] payment link failed for ${order.reference}: ${(err as Error).message}`);
      return this.handoff(conv, `Could not create a Paystack link for order ${order.reference} (${naira(order.total)}).`);
    }

    order.status = "awaiting_payment";
    order.paymentUrl = url;
    await this.d.store.saveOrder(order);
    conv.state = "awaiting_payment";
    await this.say(
      conv,
      `Order ${order.reference}\nTotal: ${naira(order.total)}\n\nPay securely with Paystack (card, bank transfer or USSD):\n${url}\n\nI'll confirm here as soon as your payment comes through.`,
    );
  }

  private async cancel(conv: Conversation, order: Order): Promise<void> {
    order.status = "cancelled";
    order.note = "Cancelled by the customer.";
    await this.d.store.saveOrder(order);
    conv.state = "idle";
    conv.orderRef = undefined;
    await this.say(conv, "No problem, I've cancelled that order. Message me any time you'd like to order again.");
  }

  private async paymentClaim(conv: Conversation, pending?: Order): Promise<void> {
    if (pending?.status === "awaiting_payment") {
      await this.alertStaff(`💳 ${this.who(conv)} says they've paid for ${pending.reference} (${naira(pending.total)}). Paystack hasn't confirmed it yet.`);
      return this.say(
        conv,
        "Thank you! If you paid with the link, your confirmation will arrive here within a few minutes. If you paid another way, a team member will check and get back to you.",
      );
    }
    return this.handoff(conv, "Says they've paid, but has no order waiting for payment.");
  }

  // ---------------------------------------------------------------------------
  // Answers
  // ---------------------------------------------------------------------------

  private async answerQuestion(conv: Conversation, parsed: ParsedMessage, products: Product[]): Promise<void> {
    const bySku = new Map(products.map((p) => [p.sku, p]));
    const known = parsed.items.map((i) => bySku.get(i.sku)).filter((p): p is Product => Boolean(p?.active));
    const parts: string[] = [];
    if (known.length) {
      parts.push(
        known
          .map((p) => `• ${p.name}: ${naira(p.price)} per ${p.unit}${p.stock > 0 ? "" : " (out of stock right now)"}`)
          .join("\n"),
      );
    }
    if (parsed.unmatched.length) parts.push(`We don't have ${listWords(parsed.unmatched.map((u) => `"${u}"`))} at the moment.`);
    if (!parts.length) parts.push(this.catalogText(products));
    parts.push("To order, just send the item and how many you want.");
    await this.say(conv, parts.join("\n\n"));
  }

  private welcome(conv: Conversation, products: Product[]): string {
    const first = conv.name?.split(/\s+/)[0];
    return `Hello${first ? ` ${first}` : ""}! 👋 Welcome to ${this.d.businessName}.\n\n${this.catalogText(products)}\n\n${this.howToOrder()}`;
  }

  private howToOrder(): string {
    return `To order, send the items and quantities, for example: "2 cartons of noodles and 1 bag of rice".`;
  }

  private catalogText(products: Product[]): string {
    const inStock = products.filter((p) => p.active && p.stock > 0).slice(0, 10);
    if (!inStock.length) return "We're restocking right now. Please check back soon.";
    return `Today we have:\n${inStock.map((p) => `• ${p.name}: ${naira(p.price)} per ${p.unit}`).join("\n")}`;
  }

  // ---------------------------------------------------------------------------
  // Payments (Paystack webhook)
  // ---------------------------------------------------------------------------

  async handlePayment(charge: { reference: string; amountKobo: number; currency: string; paidAt?: string }): Promise<PaymentOutcome> {
    const found = await this.d.store.getOrder(charge.reference);
    if (!found) {
      await this.alertStaff(`⚠️ Paystack payment ${charge.reference} of ${naira(charge.amountKobo / 100)} doesn't match any order.`);
      return "unknown";
    }
    return this.queue.run(found.phone, async () => {
      const order = (await this.d.store.getOrder(charge.reference))!;
      if (order.status === "paid" || order.status === "dispatched" || order.paidAt) return "duplicate";

      const conv = (await this.d.store.getConversation(order.phone)) ?? this.newConversation(order.phone);
      const wasReplaced = order.status === "cancelled";
      order.paidAt = charge.paidAt ?? this.now().toISOString();

      if (charge.currency !== "NGN" || charge.amountKobo !== toKobo(order.total)) {
        order.status = "needs_attention";
        order.note = `Paid ${naira(charge.amountKobo / 100)} ${charge.currency}, but the order total is ${naira(order.total)}.`;
        await this.d.store.saveOrder(order);
        conv.needsHuman = true;
        conv.handoffReason = order.note;
        await this.say(conv, "Thank you, we've received your payment. A member of our team will confirm your order shortly.");
        await this.alertStaff(`⚠️ Payment check needed for ${order.reference}\n${this.who(conv)}\n${order.note}`);
        await this.saveConv(conv);
        return "mismatch";
      }

      const products = await this.d.store.listProducts();
      const bySku = new Map(products.map((p) => [p.sku, p]));
      const short = order.lines.filter((l) => (bySku.get(l.sku)?.stock ?? 0) < l.qty);
      for (const l of order.lines) await this.d.store.adjustStock(l.sku, -l.qty);

      const notes: string[] = [];
      if (short.length) notes.push(`Stock was short for ${listWords(short.map((l) => l.name))}.`);
      if (wasReplaced) notes.push("The customer had replaced this order with a newer one before paying. Check which one they want.");
      order.status = notes.length ? "needs_attention" : "paid";
      order.note = notes.join(" ") || undefined;
      await this.d.store.saveOrder(order);

      if (conv.orderRef === order.reference) {
        conv.state = "idle";
        conv.orderRef = undefined;
      }
      const firstName = conv.name?.split(/\s+/)[0];
      await this.say(
        conv,
        `✅ Payment received${firstName ? `, thank you ${firstName}` : ", thank you"}!\n\nOrder ${order.reference} is confirmed:\n${order.lines.map(lineText).join("\n")}\nTotal paid: ${naira(order.total)}\n${order.address ? `\nWe'll deliver to: ${order.address}\n` : ""}\nWe'll message you when it's on the way.`,
      );
      await this.alertStaff(
        `🛒 PAID ORDER ${order.reference}\n${this.who(conv)}\n${order.lines.map(lineText).join("\n")}\nTotal: ${naira(order.total)}\nDeliver to: ${order.address ?? "not given"}${notes.length ? `\n⚠️ ${notes.join(" ")}` : ""}\n\nWhen it leaves, send: #sent ${order.reference}`,
      );
      await this.saveConv(conv);
      return "paid";
    });
  }

  // ---------------------------------------------------------------------------
  // Hand-off to a person, and staff commands
  // ---------------------------------------------------------------------------

  private async handoff(conv: Conversation, reason: string): Promise<void> {
    conv.needsHuman = true;
    conv.handoffReason = reason;
    await this.say(conv, "I've passed this to a member of our team. They'll reply here shortly.");
    await this.alertStaff(
      `🙋 Needs a person: ${this.who(conv)}\n${reason}\n\nReply to them with:\n#reply ${conv.phone} your message\nHand back to the bot with:\n#bot ${conv.phone}`,
    );
  }

  /** Staff send commands to the business number from a number listed in STAFF_WHATSAPP_NUMBERS. */
  private async handleStaffCommand(staff: string, text: string): Promise<void> {
    const [cmd, arg = "", ...rest] = text.split(/\s+/);
    const reply = (body: string) => this.send(staff, body);
    const phone = arg.replace(/[^\d]/g, "");

    switch (cmd.toLowerCase()) {
      case "#reply": {
        const body = rest.join(" ").trim();
        if (!phone || !body) return reply("Use: #reply <customer number> <message>");
        await this.queue.run(phone, async () => {
          const conv = (await this.d.store.getConversation(phone)) ?? this.newConversation(phone);
          await this.say(conv, body);
          await this.saveConv(conv);
        });
        return reply(`Sent to +${phone}.`);
      }
      case "#bot": {
        if (!phone) return reply("Use: #bot <customer number>");
        await this.releaseToBot(phone);
        return reply(`+${phone} is back with the bot.`);
      }
      case "#sent": {
        const ref = arg.toUpperCase();
        const order = ref ? await this.d.store.getOrder(ref) : undefined;
        if (!order) return reply(`I can't find order ${ref || "(none given)"}. Use: #sent <order reference>`);
        await this.queue.run(order.phone, async () => {
          order.status = "dispatched";
          await this.d.store.saveOrder(order);
          const conv = (await this.d.store.getConversation(order.phone)) ?? this.newConversation(order.phone);
          await this.say(conv, `🚚 Your order ${order.reference} is on its way${order.address ? ` to ${order.address}` : ""}. Thank you for buying from ${this.d.businessName}!`);
          await this.saveConv(conv);
        });
        return reply(`Marked ${order.reference} as dispatched and told the customer.`);
      }
      default:
        return reply(
          "Staff commands:\n#reply <number> <message> — message a customer\n#bot <number> — hand a chat back to the bot\n#sent <order ref> — mark dispatched and tell the customer\n\nAny message from you also keeps alerts flowing to this phone for 24 hours.",
        );
    }
  }

  /** Clear a hand-off so the bot answers this customer again. */
  async releaseToBot(phone: string): Promise<void> {
    await this.queue.run(phone, async () => {
      const conv = await this.d.store.getConversation(phone);
      if (!conv) return;
      conv.needsHuman = false;
      conv.handoffReason = undefined;
      conv.misunderstood = 0;
      await this.saveConv(conv);
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private newConversation(phone: string): Conversation {
    return { phone, state: "idle", needsHuman: false, misunderstood: 0, history: [], updatedAt: this.now().toISOString() };
  }

  private async saveConv(conv: Conversation): Promise<void> {
    conv.history = conv.history.slice(-HISTORY_LIMIT);
    conv.updatedAt = this.now().toISOString();
    await this.d.store.saveConversation(conv);
  }

  private who(conv: Conversation): string {
    return `${conv.name ?? "Customer"} (+${conv.phone})`;
  }

  private async say(conv: Conversation, body: string): Promise<void> {
    conv.history.push({ role: "desk", text: body, at: this.now().toISOString() });
    await this.send(conv.phone, body);
  }

  private async send(to: string, body: string): Promise<void> {
    try {
      await this.d.messenger.sendText(to, body);
    } catch (err) {
      this.log(`[desk] could not send to ${to}: ${(err as Error).message}`);
    }
  }

  private async alertStaff(body: string): Promise<void> {
    if (!this.d.staffNumbers.length) this.log(`[desk] staff alert (no staff numbers set):\n${body}`);
    for (const n of this.d.staffNumbers) await this.send(n, body);
  }
}
