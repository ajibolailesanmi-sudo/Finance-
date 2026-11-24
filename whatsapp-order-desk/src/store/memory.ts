import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Conversation, Order, Product } from "../types.js";
import type { Store } from "./types.js";

type Snapshot = {
  products: Product[];
  conversations: Record<string, Conversation>;
  orders: Record<string, Order>;
};

const clone = <T>(v: T): T => structuredClone(v);

/**
 * In-memory store, optionally persisted to a JSON file after every write.
 * Used by the simulator, the tests, and single-server setups without Airtable.
 */
export class MemoryStore implements Store {
  private data: Snapshot;

  constructor(seedProducts: Product[], private readonly file?: string) {
    if (file && existsSync(file)) {
      this.data = JSON.parse(readFileSync(file, "utf8")) as Snapshot;
    } else {
      this.data = { products: clone(seedProducts), conversations: {}, orders: {} };
    }
  }

  private persist(): void {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.file);
  }

  async listProducts(): Promise<Product[]> {
    return clone(this.data.products);
  }

  async adjustStock(sku: string, delta: number): Promise<void> {
    const p = this.data.products.find((x) => x.sku === sku);
    if (!p) throw new Error(`Unknown SKU ${sku}`);
    p.stock += delta;
    this.persist();
  }

  async getConversation(phone: string): Promise<Conversation | undefined> {
    const c = this.data.conversations[phone];
    return c ? clone(c) : undefined;
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    this.data.conversations[conversation.phone] = clone(conversation);
    this.persist();
  }

  async getOrder(reference: string): Promise<Order | undefined> {
    const o = this.data.orders[reference];
    return o ? clone(o) : undefined;
  }

  async saveOrder(order: Order): Promise<void> {
    this.data.orders[order.reference] = clone(order);
    this.persist();
  }

  /** For the simulator and tests. */
  async listOrders(): Promise<Order[]> {
    return Object.values(this.data.orders).map(clone);
  }
}
