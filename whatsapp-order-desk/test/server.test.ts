import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { parseWhatsAppWebhook, verifyWhatsAppSignature } from "../src/channels/whatsapp.js";
import { parsePaystackEvent, verifyPaystackSignature } from "../src/channels/paystack.js";
import { loadConfig } from "../src/config.js";
import { createDeskServer } from "../src/server.js";
import { AirtableStore, formulaString } from "../src/store/airtable.js";
import { CUSTOMER, STAFF, setup } from "./helpers.js";

const APP_SECRET = "app-secret";
const PAYSTACK_SECRET = "sk_test_x";

function waPayload(id: string, text: string) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: CUSTOMER, profile: { name: "Ada Okafor" } }],
              messages: [{ id, from: CUSTOMER, type: "text", text: { body: text } }],
            },
          },
        ],
      },
    ],
  };
}

test("WhatsApp payload parsing ignores status updates and reads names", () => {
  const msgs = parseWhatsAppWebhook(waPayload("wamid.1", "hi"));
  assert.deepEqual(msgs, [{ id: "wamid.1", from: CUSTOMER, name: "Ada Okafor", kind: "text", text: "hi" }]);
  assert.deepEqual(parseWhatsAppWebhook({ entry: [{ changes: [{ value: { statuses: [{ id: "x" }] } }] }] }), []);
});

test("signature checks", () => {
  const body = Buffer.from('{"a":1}');
  const wa = "sha256=" + createHmac("sha256", APP_SECRET).update(body).digest("hex");
  assert.ok(verifyWhatsAppSignature(body, wa, APP_SECRET));
  assert.ok(!verifyWhatsAppSignature(body, wa, "other"));
  assert.ok(!verifyWhatsAppSignature(body, undefined, APP_SECRET));
  const ps = createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");
  assert.ok(verifyPaystackSignature(body, ps, PAYSTACK_SECRET));
  assert.ok(!verifyPaystackSignature(body, ps.replace(/^./, "0"), PAYSTACK_SECRET) || ps[0] === "0");
  assert.equal(parsePaystackEvent({ event: "transfer.success", data: { reference: "x" } }), undefined);
});

test("server: verify handshake, signed messages in, signed payments in, forged ones rejected", async () => {
  const { desk, store, lastTo } = setup();
  const config = loadConfig({
    WHATSAPP_VERIFY_TOKEN: "verify-me",
    WHATSAPP_APP_SECRET: APP_SECRET,
    PAYSTACK_SECRET_KEY: PAYSTACK_SECRET,
    STAFF_WHATSAPP_NUMBERS: STAFF,
  });
  const server = createDeskServer(desk, config, { log: () => {} });
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const settle = () => new Promise((r) => setTimeout(r, 50));

  try {
    const hs = await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345`);
    assert.equal(await hs.text(), "12345");
    assert.equal((await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1`)).status, 403);

    const postWa = (payload: unknown, secret = APP_SECRET) => {
      const raw = JSON.stringify(payload);
      const sig = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
      return fetch(`${base}/webhooks/whatsapp`, { method: "POST", body: raw, headers: { "x-hub-signature-256": sig } });
    };

    assert.equal((await postWa(waPayload("w1", "send 1 bag of rice"))).status, 200);
    await settle();
    assert.match(lastTo(CUSTOMER), /Total: ₦88,000/);

    // Same message id again (Meta retry) is ignored.
    const before = (await store.listOrders()).length;
    await postWa(waPayload("w1", "send 1 bag of rice"));
    await settle();
    assert.equal((await store.listOrders()).length, before);

    assert.equal((await postWa(waPayload("w2", "yes"), "forged")).status, 401);

    await postWa(waPayload("w3", "yes"));
    await settle();
    await postWa(waPayload("w4", "1 Marina Road, Lagos Island"));
    await settle();
    assert.match(lastTo(CUSTOMER), /pay\.test\/OD-TEST-1/);

    const postPs = (payload: unknown, secret = PAYSTACK_SECRET) => {
      const raw = JSON.stringify(payload);
      const sig = createHmac("sha512", secret).update(raw).digest("hex");
      return fetch(`${base}/webhooks/paystack`, { method: "POST", body: raw, headers: { "x-paystack-signature": sig } });
    };
    const charge = { event: "charge.success", data: { reference: "OD-TEST-1", amount: 8_800_000, currency: "NGN" } };
    assert.equal((await postPs(charge, "forged")).status, 401);
    assert.equal((await store.getOrder("OD-TEST-1"))!.status, "awaiting_payment");

    assert.equal((await postPs(charge)).status, 200);
    await settle();
    assert.equal((await store.getOrder("OD-TEST-1"))!.status, "paid");
    assert.match(lastTo(STAFF), /PAID ORDER OD-TEST-1/);

    assert.equal((await fetch(`${base}/health`)).status, 200);
  } finally {
    server.close();
  }
});

test("Airtable store sends the expected requests", async () => {
  const calls: { method: string; url: string; body?: any }[] = [];
  const fakeFetch = (async (url: string, init: any) => {
    calls.push({ method: init.method, url, body: init.body ? JSON.parse(init.body) : undefined });
    const u = new URL(url);
    if (init.method === "GET" && u.pathname.endsWith("/Products")) {
      return new Response(
        JSON.stringify({
          records: [
            { id: "rec1", fields: { SKU: "RICE-50", Name: "Rice", Aliases: "rice, bag of rice", Unit: "50kg bag", Price: 88000, Stock: 4, Active: true } },
          ],
        }),
      );
    }
    if (init.method === "GET") return new Response(JSON.stringify({ records: [] }));
    return new Response(JSON.stringify({ records: [] }));
  }) as typeof fetch;

  const store = new AirtableStore({ token: "pat", baseId: "appBASE", fetchImpl: fakeFetch });
  const [p] = await store.listProducts();
  assert.deepEqual(p.aliases, ["rice", "bag of rice"]);
  assert.equal(p.active, true);

  await store.saveOrder({
    reference: "OD-1",
    phone: CUSTOMER,
    lines: [{ sku: "RICE-50", name: "Rice", unit: "50kg bag", qty: 2, unitPrice: 88000, lineTotal: 176000 }],
    total: 176000,
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  const lookup = calls.find((c) => c.method === "GET" && c.url.includes("/Orders"))!;
  assert.match(decodeURIComponent(lookup.url), /filterByFormula=\{Reference\}='OD-1'/);
  const create = calls.find((c) => c.method === "POST")!;
  assert.equal(create.body.typecast, true);
  assert.equal(create.body.records[0].fields.Items, "2 × Rice (50kg bag)");
  assert.equal(formulaString("O'Neil\\x"), "'O\\'Neil\\\\x'");
});
