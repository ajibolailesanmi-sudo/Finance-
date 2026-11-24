import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { PaystackPayments } from "./channels/paystack.js";
import { WhatsAppCloudMessenger } from "./channels/whatsapp.js";
import type { Config } from "./config.js";
import { OrderDesk } from "./desk.js";
import { ClaudeParser } from "./parser/claude.js";
import { FallbackParser } from "./parser/index.js";
import { RulesParser } from "./parser/rules.js";
import type { MessageParser } from "./parser/types.js";
import { AirtableStore } from "./store/airtable.js";
import { MemoryStore } from "./store/memory.js";
import type { Store } from "./store/types.js";
import type { Messenger, PaymentProvider, Product } from "./types.js";

/** Builds the desk and its connectors from configuration. */

export function loadSampleCatalog(path = "data/sample-catalog.json"): Product[] {
  return JSON.parse(readFileSync(path, "utf8")) as Product[];
}

export function buildStore(config: Config): Store {
  if (config.airtable.token && config.airtable.baseId) {
    return new AirtableStore({ token: config.airtable.token, baseId: config.airtable.baseId });
  }
  return new MemoryStore(loadSampleCatalog(), config.dataFile);
}

export function buildParser(config: Config): MessageParser {
  const rules = new RulesParser();
  if (!config.claude.enabled) return rules;
  const claude = new ClaudeParser(new Anthropic(), { model: config.claude.model, businessName: config.businessName });
  return new FallbackParser(claude, rules);
}

export type Connectors = {
  store: Store;
  parser: MessageParser;
  messenger: Messenger;
  payments: PaymentProvider & Partial<Pick<PaystackPayments, "verify">>;
};

export function buildConnectors(config: Config): Connectors {
  const { token, phoneNumberId, graphVersion } = config.whatsapp;
  if (!token || !phoneNumberId) throw new Error("WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required to run the server.");
  if (!config.paystack.secretKey) throw new Error("PAYSTACK_SECRET_KEY is required to run the server.");
  return {
    store: buildStore(config),
    parser: buildParser(config),
    messenger: new WhatsAppCloudMessenger({ token, phoneNumberId, graphVersion }),
    payments: new PaystackPayments({
      secretKey: config.paystack.secretKey,
      callbackUrl: config.publicUrl ? `${config.publicUrl}/paid` : undefined,
    }),
  };
}

export function buildDesk(config: Config, c: Omit<Connectors, "payments"> & { payments: PaymentProvider }): OrderDesk {
  return new OrderDesk({
    store: c.store,
    parser: c.parser,
    messenger: c.messenger,
    payments: c.payments,
    businessName: config.businessName,
    staffNumbers: config.staffNumbers,
    emailDomain: config.paystack.emailDomain,
  });
}
