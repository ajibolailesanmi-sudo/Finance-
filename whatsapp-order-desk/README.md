# WhatsApp order desk

An AI agent on a business's WhatsApp number. It takes an order, checks stock,
sends a Paystack payment link, confirms the payment, and tells staff to
dispatch. Built for Nigerian distributors, pharmacies, building-material
sellers and food suppliers that already take orders on WhatsApp.

```
Customer: abeg send 2 carton indomie and 1 bag of rice
Desk:     Here's your order:
          • 2 × Instant noodles, chicken 70g (carton of 40) — ₦27,000
          • 1 × Parboiled rice 50kg (50kg bag) — ₦88,000
          Total: ₦115,000
          Reply YES to confirm, or tell me what to change.
Customer: yes
Desk:     What's the delivery address?
Customer: 15 Admiralty Way, Lekki Phase 1
Desk:     Pay securely with Paystack: https://checkout.paystack.com/…
          … customer pays …
Desk:     ✅ Payment received! Order OD-261124-TWAX is confirmed.
Staff:    🛒 PAID ORDER OD-261124-TWAX … Deliver to: 15 Admiralty Way …
```

## What it does

- **Reads orders in plain English or Pidgin.** Claude turns each message into
  products and quantities from your catalog. Without a Claude key, a keyword
  reader handles the common phrasings.
- **Prices come from your catalog, never from the AI.** Totals, stock checks
  and every reply are computed in code.
- **Checks stock** when it drafts the order, again before sending the payment
  link, and reduces it when payment lands.
- **Takes payment with Paystack** by card, bank transfer or USSD. Payments are
  confirmed by Paystack's webhook and double-checked with Paystack's API.
  Wrong amounts are flagged for a person, and repeated webhooks are ignored.
- **Hands off to a person** for complaints, refunds, haggling, pictures (often
  transfer receipts), payment questions, or after two messages it can't
  understand. While a chat is with a person, the bot stays quiet and forwards
  the customer's messages to staff.
- **Alerts staff on WhatsApp** for every paid order and every hand-off.

Out of scope for this version: voice notes, Yoruba, Hausa and Igbo, checking
bank-transfer receipts, invoices, and linking to accounting or inventory
software.

## Try it in 30 seconds (no accounts needed)

```bash
npm install
npm run simulate
```

Type as the customer. `/pay` simulates the Paystack payment, `/stock` shows
stock, `/orders` lists orders, `/staff #reply 2348012345678 hello` sends a
staff command, `/quit` exits. Set `ANTHROPIC_API_KEY` first to use Claude
instead of the keyword reader.

```bash
npm test          # 25 tests: order flow, payments, hand-offs, webhooks, Airtable
npm run typecheck
```

## Staff commands

Staff send these to the business's WhatsApp number from a phone listed in
`STAFF_WHATSAPP_NUMBERS`.

| Command | What it does |
|---|---|
| `#reply 2348012345678 your message` | Sends your message to that customer from the business number |
| `#bot 2348012345678` | Hands the chat back to the bot |
| `#sent OD-261124-TWAX` | Marks the order dispatched and tells the customer it's on the way |
| `#help` | Lists the commands |

**Important WhatsApp rule:** the business number can only send free-form
messages to a phone that messaged it in the last 24 hours. Each staff member
should send `#help` to the business number at the start of each day, so
alerts reach them. Customers are never affected, because the desk only ever
replies to them.

## Going live

You need five things. Do them in this order.

### 1. Airtable: the shop's dashboard

1. Create a base with three tables. Field names must match exactly.
   - **Products:** SKU, Name, Aliases, Unit (single line text); Price, Stock
     (number); Active (checkbox). Import `airtable/Products.csv` to start, then
     replace it with the client's real products.
   - **Orders:** Reference, Phone, Customer, Address, Status, Payment link,
     Created, Paid at (single line text); Items, Note, Lines JSON (long text);
     Total (number).
   - **Conversations:** Phone, Name, State, Order ref, Last address, Handoff
     reason, Updated (single line text); History JSON (long text);
     Misunderstood (number); Needs human (checkbox).
2. Create a personal access token at airtable.com/create/tokens with
   `data.records:read` and `data.records:write` on that base only.
3. Set `AIRTABLE_TOKEN` and `AIRTABLE_BASE_ID` (the `app…` part of the base URL).

Staff change prices and stock in **Products**, watch **Orders**, and can untick
**Needs human** in **Conversations** instead of sending `#bot`.

Without Airtable the desk keeps everything in a JSON file on the server. That
is fine for a demo, but use Airtable for a real client.

### 2. Paystack

1. Use the client's Paystack business account. Start with the **test** secret
   key (`sk_test_…`).
2. Settings → API Keys & Webhooks → set the webhook URL to
   `https://<your server>/webhooks/paystack`.
3. Set `PAYSTACK_SECRET_KEY` and `ORDER_EMAIL_DOMAIN`.

### 3. WhatsApp Cloud API

1. In Meta for Developers, create a Business app and add the WhatsApp product.
   Register the client's business phone number. A number used on the Cloud API
   generally cannot also be used in the WhatsApp Business app, so plan for a
   dedicated number.
2. Create a permanent access token through a System User in Business Settings.
   Set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`.
3. Webhook: callback URL `https://<your server>/webhooks/whatsapp`, verify
   token = your `WHATSAPP_VERIFY_TOKEN`. Subscribe to the **messages** field.
4. Set `WHATSAPP_APP_SECRET` from App settings → Basic. The server rejects
   webhooks that are not signed with it.

Meta charges per conversation. Replies to customers inside the 24-hour window
are the cheapest category, so check Meta's current Nigeria rates when pricing
a client.

### 4. Claude

Create an API key at console.anthropic.com and set `ANTHROPIC_API_KEY`. The
desk uses Claude Opus 5.5 at low effort to read each message, with Anthropic's
server-side fallback turned on so a declined request is retried on another
model. If Claude is unreachable, the keyword reader takes over automatically.
Change the model with `CLAUDE_MODEL`.

### 5. Host the server

Any always-on Node 20+ host works: Render, Railway, Fly.io, or a small VPS.

```bash
npm install
npm run build
npm start
```

Set the environment variables from `.env.example` in the host's dashboard and
point the Meta and Paystack webhooks at the server's https address. Check
`https://<your server>/health` returns `ok`.

Run one instance. The per-customer message ordering and the duplicate-message
filter live in memory, so two instances could handle the same customer at
once.

## Before taking real money

- Run a full order on Paystack **test** mode with a staff phone as the customer.
- Load the real catalog with the aliases customers actually use. Read a week
  of the client's WhatsApp orders and add the nicknames you see.
- Agree what staff do with hand-offs and who answers them, and how fast.
- Switch to the live Paystack key.

## How it is built

| File | Role |
|---|---|
| `src/desk.ts` | Conversation flow, pricing, stock, payments, hand-offs, staff commands |
| `src/parser/claude.ts` | Claude reads a message into intent, SKUs, quantities and address |
| `src/parser/rules.ts` | Keyword reader, used without a Claude key or when Claude fails |
| `src/channels/whatsapp.ts` | WhatsApp Cloud API: send, parse webhooks, check signatures |
| `src/channels/paystack.ts` | Paystack: payment links, verify, webhook signatures |
| `src/store/airtable.ts` | Airtable tables as the database and dashboard |
| `src/store/memory.ts` | JSON-file store for demos and tests |
| `src/server.ts` | HTTP endpoints for the webhooks |
| `src/simulate.ts` | Terminal simulator |
