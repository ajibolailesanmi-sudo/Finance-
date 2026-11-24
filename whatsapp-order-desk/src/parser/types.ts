import type { ConversationState, Order, Product, Turn } from "../types.js";

export const INTENTS = [
  "order", // wants to buy or change what they are buying
  "product_question", // asks about price or availability
  "greeting",
  "confirm", // yes to the order summary
  "decline", // cancel / not now
  "address", // gives a delivery address
  "payment_claim", // says they have paid
  "human", // complaint, negotiation, refund, asks for a person
  "other",
] as const;

export type Intent = (typeof INTENTS)[number];

/** What the desk understood from one customer message. Quantities are in each product's unit. */
export type ParsedMessage = {
  intent: Intent;
  items: { sku: string; qty: number }[];
  /** Things the customer asked for that are not in the catalog, in their words. */
  unmatched: string[];
  /** Delivery address if the message contains one, else "". */
  address: string;
};

export type ParseContext = {
  products: Product[];
  state: ConversationState;
  pendingOrder?: Order;
  history: Turn[];
};

export interface MessageParser {
  readonly name: string;
  parse(text: string, ctx: ParseContext): Promise<ParsedMessage>;
}
