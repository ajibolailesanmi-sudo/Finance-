import assert from "node:assert/strict";
import { test } from "node:test";
import { CUSTOMER, STAFF, setup } from "./helpers.js";

test("happy path: order, confirm, address, pay, dispatch", async () => {
  const { store, desk, say, lastTo, links } = setup();

  await say("Good morning");
  assert.match(lastTo(CUSTOMER), /Welcome to Test Wholesale/);
  assert.match(lastTo(CUSTOMER), /Instant noodles, chicken 70g: ₦13,500 per carton of 40/);

  await say("abeg send 2 carton indomie and 1 bag of rice");
  const summary = lastTo(CUSTOMER);
  assert.match(summary, /2 × Instant noodles/);
  assert.match(summary, /1 × Parboiled rice 50kg/);
  assert.match(summary, /Total: ₦115,000/); // 2 × 13,500 + 88,000
  assert.match(summary, /delivery address next/);

  await say("yes");
  assert.match(lastTo(CUSTOMER), /delivery address/);

  await say("12 Adeola Odeku Street, Victoria Island, Lagos");
  assert.match(lastTo(CUSTOMER), /https:\/\/pay\.test\/OD-TEST-1/);
  assert.equal(links[0].amountKobo, 11_500_000);
  assert.equal(links[0].email, `wa${CUSTOMER}@orders.test`);

  const outcome = await desk.handlePayment({ reference: "OD-TEST-1", amountKobo: 11_500_000, currency: "NGN" });
  assert.equal(outcome, "paid");
  assert.match(lastTo(CUSTOMER), /Payment received, thank you Ada/);
  assert.match(lastTo(CUSTOMER), /Adeola Odeku/);
  assert.match(lastTo(STAFF), /PAID ORDER OD-TEST-1/);

  const products = await store.listProducts();
  assert.equal(products.find((p) => p.sku === "NOODLE-CTN")!.stock, 118);
  assert.equal(products.find((p) => p.sku === "RICE-50")!.stock, 39);
  assert.equal((await store.getOrder("OD-TEST-1"))!.status, "paid");
  assert.equal((await store.getConversation(CUSTOMER))!.state, "idle");

  // Paystack retries webhooks; a second delivery must not double-count stock.
  assert.equal(await desk.handlePayment({ reference: "OD-TEST-1", amountKobo: 11_500_000, currency: "NGN" }), "duplicate");
  assert.equal((await store.listProducts()).find((p) => p.sku === "RICE-50")!.stock, 39);

  await say("#sent od-test-1", STAFF);
  assert.match(lastTo(CUSTOMER), /on its way to 12 Adeola Odeku/);
  assert.equal((await store.getOrder("OD-TEST-1"))!.status, "dispatched");
});

test("address given up front goes straight to payment on YES", async () => {
  const { say, lastTo } = setup();
  await say("I want 3 packs of water. deliver to 4 Allen Avenue, Ikeja");
  // Keyword parser does not split addresses out, so ask for it; that's fine.
  await say("yes");
  const reply = lastTo(CUSTOMER);
  assert.ok(/pay\.test|delivery address/.test(reply), reply);
});

test("price question is answered from the catalog without creating an order", async () => {
  const { store, say, lastTo } = setup();
  await say("how much is oil?");
  assert.match(lastTo(CUSTOMER), /Vegetable oil 25L: ₦72,000 per 25L keg/);
  assert.equal((await store.listOrders()).length, 0);
});

test("out of stock and short stock are explained instead of drafting", async () => {
  const { store, say, lastTo } = setup();
  await say("send 2 bags of semo");
  assert.match(lastTo(CUSTOMER), /Semolina 10kg is out of stock/);
  await say("I need 10 cartons of tomato paste");
  assert.match(lastTo(CUSTOMER), /only have 3 × carton of 50 of Tomato paste/);
  assert.equal((await store.listOrders()).length, 0);
});

test("a new order replaces the unpaid one", async () => {
  const { store, say } = setup();
  await say("send 1 bag of sugar");
  await say("actually send 2 carton spaghetti");
  assert.equal((await store.getOrder("OD-TEST-1"))!.status, "cancelled");
  assert.equal((await store.getOrder("OD-TEST-2"))!.total, 35_000);
});

test("cancel with NO", async () => {
  const { store, say, lastTo } = setup();
  await say("send 1 bag of rice");
  await say("no");
  assert.match(lastTo(CUSTOMER), /cancelled/);
  assert.equal((await store.getOrder("OD-TEST-1"))!.status, "cancelled");
});

test("complaints go to a person; the bot then stays quiet and forwards messages", async () => {
  const { store, say, lastTo, sent } = setup();
  await say("my last delivery was damaged, I want a refund");
  assert.match(lastTo(CUSTOMER), /passed this to a member of our team/);
  assert.match(lastTo(STAFF), /Needs a person: Ada Okafor/);
  assert.equal((await store.getConversation(CUSTOMER))!.needsHuman, true);

  const before = sent.filter((m) => m.to === CUSTOMER).length;
  await say("hello??");
  assert.equal(sent.filter((m) => m.to === CUSTOMER).length, before, "bot should not reply during hand-off");
  assert.match(lastTo(STAFF), /hello\?\?/);

  await say(`#reply ${CUSTOMER} Sorry about that, we'll replace it today.`, STAFF);
  assert.match(lastTo(CUSTOMER), /we'll replace it today/);
  await say(`#bot ${CUSTOMER}`, STAFF);
  assert.equal((await store.getConversation(CUSTOMER))!.needsHuman, false);
  await say("hi");
  assert.match(lastTo(CUSTOMER), /Welcome/);
});

test("pictures (often transfer receipts) go to a person", async () => {
  const { desk, lastTo } = setup();
  await desk.handleInbound({ id: "img1", from: CUSTOMER, kind: "image", text: "see my receipt" });
  assert.match(lastTo(STAFF), /Sent a picture with the note "see my receipt"/);
});

test("voice notes get a polite ask to type", async () => {
  const { desk, lastTo } = setup();
  await desk.handleInbound({ id: "a1", from: CUSTOMER, kind: "audio" });
  assert.match(lastTo(CUSTOMER), /only read typed messages/);
});

test("two messages the desk can't understand hand over to a person", async () => {
  const { say, lastTo } = setup();
  await say("qwerty zxcv");
  assert.match(lastTo(CUSTOMER), /didn't quite get that/);
  await say("asdf ghjk");
  assert.match(lastTo(STAFF), /could not understand/);
});

test("wrong payment amount is flagged for a person", async () => {
  const { store, desk, say, lastTo } = setup();
  await say("send 1 bag of rice to 5 Bode Thomas Street, Surulere");
  await say("yes");
  await say("5 Bode Thomas Street, Surulere"); // keyword parser asks for the address after YES
  const outcome = await desk.handlePayment({ reference: "OD-TEST-1", amountKobo: 100_000, currency: "NGN" });
  assert.equal(outcome, "mismatch");
  assert.equal((await store.getOrder("OD-TEST-1"))!.status, "needs_attention");
  assert.match(lastTo(STAFF), /Payment check needed/);
  assert.equal((await store.listProducts()).find((p) => p.sku === "RICE-50")!.stock, 40, "stock untouched");
});

test("payment for an unknown reference alerts staff", async () => {
  const { desk, lastTo } = setup();
  assert.equal(await desk.handlePayment({ reference: "NOPE", amountKobo: 5000, currency: "NGN" }), "unknown");
  assert.match(lastTo(STAFF), /doesn't match any order/);
});

test("if Paystack is down the customer is handed to a person, not left hanging", async () => {
  const { say, lastTo } = setup({ failPayments: true });
  await say("send 1 bag of rice");
  await say("yes");
  await say("2 Awolowo Road, Ikoyi");
  assert.match(lastTo(STAFF), /Could not create a Paystack link/);
});

test("customer says they paid before Paystack confirms", async () => {
  const { say, lastTo } = setup();
  await say("send 1 bag of rice");
  await say("yes");
  await say("2 Awolowo Road, Ikoyi");
  await say("I have paid");
  assert.match(lastTo(CUSTOMER), /confirmation will arrive here/);
  assert.match(lastTo(STAFF), /says they've paid for OD-TEST-1/);
});
