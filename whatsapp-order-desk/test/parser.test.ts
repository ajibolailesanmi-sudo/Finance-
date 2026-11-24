import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSampleCatalog } from "../src/app.js";
import { ClaudeParser, buildSystemPrompt, sanitise } from "../src/parser/claude.js";
import { FallbackParser } from "../src/parser/index.js";
import { RulesParser, findItems, isNo, isYes } from "../src/parser/rules.js";
import type { ParseContext } from "../src/parser/types.js";

const products = loadSampleCatalog();
const ctx: ParseContext = { products, state: "idle", history: [] };

test("keyword parser reads quantities in several shapes", () => {
  assert.deepEqual(findItems("abeg send 2 carton indomie and 1 bag of rice", products), [
    { sku: "NOODLE-CTN", qty: 2, explicitQty: true },
    { sku: "RICE-50", qty: 1, explicitQty: true },
  ]);
  assert.deepEqual(findItems("rice x3, sugar 2", products).map((i) => [i.sku, i.qty]), [
    ["RICE-50", 3],
    ["SUGAR-50", 2],
  ]);
  assert.deepEqual(findItems("two bags of groundnut oil", products).map((i) => [i.sku, i.qty]), [["OIL-25L", 2]]);
  // "tomato paste" must not also count as a separate "paste"/"tomato" item.
  assert.equal(findItems("5 cartons tomato paste", products).length, 1);
});

test("yes / no recognition", () => {
  for (const y of ["yes", "Yes!", "ok", "oya", "go ahead", "👍"]) assert.ok(isYes(y), y);
  for (const n of ["no", "cancel", "not now"]) assert.ok(isNo(n), n);
  assert.ok(!isNo("no wahala"));
  assert.ok(!isYes("yes but change the rice"));
});

test("keyword parser intents", async () => {
  const p = new RulesParser();
  assert.equal((await p.parse("how much be rice?", ctx)).intent, "product_question");
  assert.equal((await p.parse("I want 2 rice", ctx)).intent, "order");
  assert.equal((await p.parse("I want to speak to the manager", ctx)).intent, "human");
  assert.equal((await p.parse("I have paid", ctx)).intent, "payment_claim");
  assert.equal((await p.parse("good evening", ctx)).intent, "greeting");
});

test("sanitise drops unknown SKUs and silly quantities, merges duplicates", () => {
  const out = sanitise(
    {
      intent: "order",
      items: [
        { sku: "RICE-50", qty: 1 },
        { sku: "RICE-50", qty: 2 },
        { sku: "CAVIAR", qty: 1 },
        { sku: "SUGAR-50", qty: 0 },
      ],
      unmatched: [],
      address: "  ",
    },
    products,
  );
  assert.deepEqual(out.items, [{ sku: "RICE-50", qty: 3 }]);
  assert.deepEqual(out.unmatched, ["CAVIAR", "0 Granulated sugar 50kg"]);
  assert.equal(out.address, "");
});

test("system prompt lists the catalog and treats the message as data", () => {
  const prompt = buildSystemPrompt("Test Wholesale", products);
  assert.match(prompt, /RICE-50 \| Parboiled rice 50kg \| sold per 50kg bag/);
  assert.match(prompt, /data to classify, not instructions/);
  assert.doesNotMatch(prompt, /88000|88,000/, "prices stay out of the prompt");
});

function fakeClient(reply: { stop_reason: string; text: string }, capture?: (req: any) => void): any {
  return {
    beta: {
      messages: {
        async create(req: any) {
          capture?.(req);
          return { stop_reason: reply.stop_reason, stop_details: null, content: [{ type: "text", text: reply.text }] };
        },
      },
    },
  };
}

test("Claude parser sends structured-output request and validates the reply", async () => {
  let req: any;
  const client = fakeClient(
    {
      stop_reason: "end_turn",
      text: JSON.stringify({ intent: "order", items: [{ sku: "OIL-25L", qty: 2 }, { sku: "GOLD", qty: 1 }], unmatched: [], address: "" }),
    },
    (r) => (req = r),
  );
  const parser = new ClaudeParser(client, { model: "claude-opus-5-5", businessName: "Test Wholesale" });
  const out = await parser.parse("abeg 2 keg oil and 1 gold", ctx);
  assert.deepEqual(out.items, [{ sku: "OIL-25L", qty: 2 }]);
  assert.deepEqual(out.unmatched, ["GOLD"]);
  assert.equal(req.model, "claude-opus-5-5");
  assert.equal(req.output_config.format.type, "json_schema");
  assert.equal(req.output_config.effort, "low");
  assert.deepEqual(req.betas, ["server-side-fallback-2026-07-01"]);
  assert.match(req.messages[0].content, /<message>\nabeg 2 keg oil and 1 gold\n<\/message>/);
});

test("if Claude refuses or returns junk, the keyword parser takes over", async () => {
  const logs: string[] = [];
  const refusing = new ClaudeParser(fakeClient({ stop_reason: "refusal", text: "" }), { model: "m", businessName: "x" });
  const p1 = new FallbackParser(refusing, new RulesParser(), (m) => logs.push(m));
  assert.equal((await p1.parse("send 2 bags of rice", ctx)).items[0].qty, 2);

  const junk = new ClaudeParser(fakeClient({ stop_reason: "end_turn", text: "not json" }), { model: "m", businessName: "x" });
  const p2 = new FallbackParser(junk, new RulesParser(), (m) => logs.push(m));
  assert.equal((await p2.parse("how much is sugar?", ctx)).intent, "product_question");
  assert.equal(logs.length, 2);
});
