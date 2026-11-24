import type { Product } from "../types.js";
import type { Intent, MessageParser, ParseContext, ParsedMessage } from "./types.js";

/**
 * Keyword parser. Runs when no Claude key is set (local demo, tests) and as the
 * backup when a Claude call fails. It handles the common shapes —
 * "abeg send 2 carton indomie and 1 bag rice", "how much is oil?", "yes" —
 * and leaves anything unusual to a person.
 */

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, fifty: 50, hundred: 100,
};

const YES = /^(y|ya|yes+|yeah|yep|ok|okay|okk+|k|sure|confirm(ed)?|correct|go ahead|proceed|oya|make (am|e) sharp|na so|done)\b[\s!.👍]*$/i;
const NO = /^(no|nope|nah|cancel|stop|abeg no|not now|leave (am|it)|forget (am|it))\b[\s!.]*$/i;

export function isYes(text: string): boolean {
  return YES.test(text.trim()) || /^👍+$/.test(text.trim());
}

export function isNo(text: string): boolean {
  return NO.test(text.trim());
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/(\d)\s*x\b/g, "$1 ")
    .replace(/\bx\s*(\d)/g, " $1")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readNumber(token: string | undefined): number | undefined {
  if (!token) return undefined;
  if (/^\d+$/.test(token)) return Number(token);
  return NUMBER_WORDS[token];
}

/** Find each product mentioned and the quantity written before (or right after) it. */
export function findItems(text: string, products: Product[]): { sku: string; qty: number; explicitQty: boolean }[] {
  const norm = ` ${normalise(text)} `;
  const tokens = norm.trim().split(" ");
  const matches: { sku: string; start: number; end: number }[] = []; // token indices, end exclusive
  const takenChars: Array<[number, number]> = [];

  // Longer terms first so "tomato paste" wins over "tomato".
  const terms = products
    .filter((p) => p.active)
    .flatMap((p) => [p.name, ...p.aliases].map((t) => ({ sku: p.sku, term: normalise(t) })))
    .filter((t) => t.term)
    .sort((a, b) => b.term.length - a.term.length);

  for (const { sku, term } of terms) {
    let from = 0;
    for (;;) {
      const idx = norm.indexOf(` ${term} `, from);
      if (idx < 0) break;
      from = idx + 1;
      const a = idx + 1;
      const b = a + term.length;
      if (takenChars.some(([x, y]) => a < y && b > x)) continue;
      takenChars.push([a, b]);
      if (matches.some((m) => m.sku === sku)) continue;
      const before = norm.slice(0, a).trim();
      const start = before ? before.split(" ").length : 0;
      matches.push({ sku, start, end: start + term.split(" ").length });
    }
  }
  matches.sort((x, y) => x.start - y.start);

  // Each number belongs to at most one product: the one it is written in front
  // of ("2 rice"), or failing that the one it follows ("rice 2").
  const claimed = new Set<number>();
  const inSpan = (i: number) => matches.some((m) => i >= m.start && i < m.end);
  return matches.map((m) => {
    let qty: number | undefined;
    for (let k = 1; k <= 3 && qty === undefined; k++) {
      const i = m.start - k;
      if (i < 0 || inSpan(i)) break;
      if (claimed.has(i)) continue;
      const n = readNumber(tokens[i]);
      if (n !== undefined) {
        qty = n;
        claimed.add(i);
      }
    }
    if (qty === undefined && !claimed.has(m.end)) {
      const n = readNumber(tokens[m.end]);
      if (n !== undefined) {
        qty = n;
        claimed.add(m.end);
      }
    }
    return { sku: m.sku, qty: qty ?? 1, explicitQty: qty !== undefined };
  });
}

export class RulesParser implements MessageParser {
  readonly name = "rules";

  async parse(text: string, ctx: ParseContext): Promise<ParsedMessage> {
    const t = normalise(text);
    const found = findItems(text, ctx.products);
    const items = found.map(({ sku, qty }) => ({ sku, qty }));
    const result = (intent: Intent, withItems = true, address = ""): ParsedMessage => ({
      intent,
      items: withItems ? items : [],
      unmatched: [],
      address,
    });

    if (isYes(text)) return result("confirm", false);
    if (isNo(text)) return result("decline", false);

    if (/\b(complain|complaint|refund|manager|human|person|agent|customer care|discount|last price|reduce|wrong (item|order)|damaged|not (received|delivered)|call me)\b/.test(t)) {
      return result("human", false);
    }
    if (/\b(i (have )?(paid|sent|transferred)|payment (done|made|sent)|have paid|don pay|sent (the )?money)\b/.test(t)) {
      return result("payment_claim", false);
    }

    const asks = /\b(how much|price|cost|do you have|you get|available|in stock|wetin be)\b/.test(t) || text.includes("?");
    const wants = /\b(i want|i need|send|order|buy|give me|deliver|bring|get me|add)\b/.test(t);
    if (found.length) {
      const anyQty = found.some((f) => f.explicitQty);
      if (asks && !wants && !anyQty) return result("product_question");
      return result("order");
    }

    if (ctx.state === "awaiting_address" || /\b(street|st|road|rd|close|avenue|ave|crescent|estate|lane|junction|off|lekki|ikeja|yaba|surulere|abuja|lagos|ibadan|port harcourt|kano|enugu)\b/.test(t)) {
      if (t.length >= 8) return result("address", false, text.trim());
    }

    if (/^(hi+|hello+|hey+|good (morning|afternoon|evening)|morning|evening|how far|bawo|sannu|ndewo)\b/.test(t)) {
      return result("greeting", false);
    }
    if (asks) return result("product_question", false);
    return result("other", false);
  }
}
