import type { Conversation, Order, Product } from "../types.js";

/** Where products, orders and conversations live (Airtable in production, a JSON file locally). */
export interface Store {
  listProducts(): Promise<Product[]>;
  /** Add `delta` (negative to remove) to a product's stock. */
  adjustStock(sku: string, delta: number): Promise<void>;
  getConversation(phone: string): Promise<Conversation | undefined>;
  saveConversation(conversation: Conversation): Promise<void>;
  getOrder(reference: string): Promise<Order | undefined>;
  saveOrder(order: Order): Promise<void>;
}
