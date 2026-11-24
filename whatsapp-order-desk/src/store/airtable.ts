import type { Conversation, ConversationState, Order, OrderLine, OrderStatus, Product, Turn } from "../types.js";
import type { Store } from "./types.js";

/**
 * Airtable as the shop's dashboard. One base with three tables:
 *
 *   Products       SKU, Name, Aliases, Unit, Price, Stock, Active
 *   Orders         Reference, Phone, Customer, Items, Total, Address, Status,
 *                  Payment link, Created, Paid at, Note, Lines JSON
 *   Conversations  Phone, Name, State, Order ref, Last address, Needs human,
 *                  Handoff reason, Misunderstood, History JSON, Updated
 *
 * Staff edit prices and stock in Products, watch Orders, and untick
 * "Needs human" in Conversations to hand a chat back to the bot.
 */

type AirtableRecord = { id: string; fields: Record<string, unknown> };

export type AirtableOptions = {
  token: string;
  baseId: string;
  tables?: { products?: string; orders?: string; conversations?: string };
  fetchImpl?: typeof fetch;
  /** How long to reuse the product list before re-reading it. */
  productCacheMs?: number;
};

/** Quote a value for an Airtable formula string literal. */
export function formulaString(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function json<T>(v: unknown, fallback: T): T {
  if (typeof v !== "string" || !v.trim()) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

export class AirtableStore implements Store {
  private readonly fetch: typeof fetch;
  private readonly t: { products: string; orders: string; conversations: string };
  private productCache?: { at: number; products: Product[]; ids: Map<string, string> };

  constructor(private readonly opts: AirtableOptions) {
    this.fetch = opts.fetchImpl ?? fetch;
    this.t = {
      products: opts.tables?.products ?? "Products",
      orders: opts.tables?.orders ?? "Orders",
      conversations: opts.tables?.conversations ?? "Conversations",
    };
  }

  private async call(method: string, table: string, query = "", body?: unknown): Promise<any> {
    const url = `https://api.airtable.com/v0/${this.opts.baseId}/${encodeURIComponent(table)}${query ? `?${query}` : ""}`;
    const res = await this.fetch(url, {
      method,
      headers: { Authorization: `Bearer ${this.opts.token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Airtable ${method} ${table} failed: ${res.status} ${await res.text()}`);
    }
    return res.json();
  }

  private async findOne(table: string, field: string, value: string): Promise<AirtableRecord | undefined> {
    const q = new URLSearchParams({ filterByFormula: `{${field}}=${formulaString(value)}`, maxRecords: "1" });
    const data = await this.call("GET", table, q.toString());
    return data.records?.[0];
  }

  private async upsert(table: string, keyField: string, key: string, fields: Record<string, unknown>): Promise<void> {
    const existing = await this.findOne(table, keyField, key);
    if (existing) {
      await this.call("PATCH", table, "", { records: [{ id: existing.id, fields }], typecast: true });
    } else {
      await this.call("POST", table, "", { records: [{ fields }], typecast: true });
    }
  }

  // ---- Products ------------------------------------------------------------

  async listProducts(): Promise<Product[]> {
    const ttl = this.opts.productCacheMs ?? 30_000;
    if (this.productCache && Date.now() - this.productCache.at < ttl) {
      return structuredClone(this.productCache.products);
    }
    const products: Product[] = [];
    const ids = new Map<string, string>();
    let offset: string | undefined;
    do {
      const q = new URLSearchParams({ pageSize: "100" });
      if (offset) q.set("offset", offset);
      const data = await this.call("GET", this.t.products, q.toString());
      for (const r of data.records as AirtableRecord[]) {
        const sku = str(r.fields["SKU"]);
        const name = str(r.fields["Name"]);
        if (!sku || !name) continue;
        ids.set(sku, r.id);
        products.push({
          sku,
          name,
          aliases: (str(r.fields["Aliases"]) ?? "")
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          unit: str(r.fields["Unit"]) ?? "unit",
          price: num(r.fields["Price"]),
          stock: num(r.fields["Stock"]),
          active: r.fields["Active"] === true,
        });
      }
      offset = data.offset;
    } while (offset);
    this.productCache = { at: Date.now(), products, ids };
    return structuredClone(products);
  }

  async adjustStock(sku: string, delta: number): Promise<void> {
    const rec = await this.findOne(this.t.products, "SKU", sku);
    if (!rec) throw new Error(`Unknown SKU ${sku}`);
    const stock = num(rec.fields["Stock"]) + delta;
    await this.call("PATCH", this.t.products, "", { records: [{ id: rec.id, fields: { Stock: stock } }] });
    this.productCache = undefined;
  }

  // ---- Conversations -------------------------------------------------------

  async getConversation(phone: string): Promise<Conversation | undefined> {
    const r = await this.findOne(this.t.conversations, "Phone", phone);
    if (!r) return undefined;
    const f = r.fields;
    return {
      phone,
      name: str(f["Name"]),
      state: (str(f["State"]) as ConversationState | undefined) ?? "idle",
      orderRef: str(f["Order ref"]),
      lastAddress: str(f["Last address"]),
      needsHuman: f["Needs human"] === true,
      handoffReason: str(f["Handoff reason"]),
      misunderstood: num(f["Misunderstood"]),
      history: json<Turn[]>(f["History JSON"], []),
      updatedAt: str(f["Updated"]) ?? new Date(0).toISOString(),
    };
  }

  async saveConversation(c: Conversation): Promise<void> {
    await this.upsert(this.t.conversations, "Phone", c.phone, {
      Phone: c.phone,
      Name: c.name ?? "",
      State: c.state,
      "Order ref": c.orderRef ?? "",
      "Last address": c.lastAddress ?? "",
      "Needs human": c.needsHuman,
      "Handoff reason": c.handoffReason ?? "",
      Misunderstood: c.misunderstood,
      "History JSON": JSON.stringify(c.history),
      Updated: c.updatedAt,
    });
  }

  // ---- Orders --------------------------------------------------------------

  async getOrder(reference: string): Promise<Order | undefined> {
    const r = await this.findOne(this.t.orders, "Reference", reference);
    if (!r) return undefined;
    const f = r.fields;
    return {
      reference,
      phone: str(f["Phone"]) ?? "",
      customerName: str(f["Customer"]),
      lines: json<OrderLine[]>(f["Lines JSON"], []),
      total: num(f["Total"]),
      address: str(f["Address"]),
      status: (str(f["Status"]) as OrderStatus | undefined) ?? "draft",
      paymentUrl: str(f["Payment link"]),
      createdAt: str(f["Created"]) ?? new Date(0).toISOString(),
      paidAt: str(f["Paid at"]),
      note: str(f["Note"]),
    };
  }

  async saveOrder(o: Order): Promise<void> {
    await this.upsert(this.t.orders, "Reference", o.reference, {
      Reference: o.reference,
      Phone: o.phone,
      Customer: o.customerName ?? "",
      Items: o.lines.map((l) => `${l.qty} × ${l.name} (${l.unit})`).join("\n"),
      "Lines JSON": JSON.stringify(o.lines),
      Total: o.total,
      Address: o.address ?? "",
      Status: o.status,
      "Payment link": o.paymentUrl ?? "",
      Created: o.createdAt,
      "Paid at": o.paidAt ?? "",
      Note: o.note ?? "",
    });
  }
}
