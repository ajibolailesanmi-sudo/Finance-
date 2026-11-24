// Shared data shapes for the order desk.

/** A product the business sells. Prices are in naira; stock is in the product's unit. */
export type Product = {
  sku: string;
  name: string;
  /** Other words customers use for it ("indomie", "noodles"). */
  aliases: string[];
  /** What one unit is ("carton of 40", "50kg bag"). */
  unit: string;
  price: number;
  stock: number;
  active: boolean;
};

export type OrderLine = {
  sku: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderStatus =
  | "draft" // summary sent, waiting for the customer to confirm
  | "awaiting_payment" // payment link sent
  | "paid"
  | "dispatched"
  | "cancelled"
  | "needs_attention"; // something a person must look at (amount mismatch, stock short after payment)

export type Order = {
  /** Also the Paystack transaction reference. */
  reference: string;
  phone: string;
  customerName?: string;
  lines: OrderLine[];
  total: number;
  address?: string;
  status: OrderStatus;
  paymentUrl?: string;
  createdAt: string;
  paidAt?: string;
  note?: string;
};

export type ConversationState =
  | "idle"
  | "awaiting_confirmation"
  | "awaiting_address"
  | "awaiting_payment";

export type Turn = { role: "customer" | "desk"; text: string; at: string };

export type Conversation = {
  phone: string;
  name?: string;
  state: ConversationState;
  /** Reference of the order being discussed or paid for. */
  orderRef?: string;
  lastAddress?: string;
  /** While true the bot stays quiet and forwards messages to staff. */
  needsHuman: boolean;
  handoffReason?: string;
  /** Consecutive messages the desk could not understand. */
  misunderstood: number;
  history: Turn[];
  updatedAt: string;
};

export type InboundKind = "text" | "image" | "document" | "audio" | "video" | "location" | "other";

export type InboundMessage = {
  id: string;
  from: string;
  name?: string;
  kind: InboundKind;
  text?: string;
};

/** Sends WhatsApp text messages. */
export interface Messenger {
  sendText(to: string, body: string): Promise<void>;
}

export type PaymentLinkRequest = {
  reference: string;
  amountKobo: number;
  email: string;
  phone: string;
  customerName?: string;
};

export interface PaymentProvider {
  createPaymentLink(req: PaymentLinkRequest): Promise<{ url: string }>;
}
