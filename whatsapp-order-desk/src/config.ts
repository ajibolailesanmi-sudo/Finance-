// Reads settings from environment variables. Every external service is
// optional so the desk can run locally (simulator, tests) with none of them.

export type Config = {
  port: number;
  businessName: string;
  publicUrl?: string;
  staffNumbers: string[];
  whatsapp: {
    token?: string;
    phoneNumberId?: string;
    verifyToken?: string;
    appSecret?: string;
    graphVersion: string;
  };
  paystack: {
    secretKey?: string;
    /** Customers on WhatsApp rarely give an email; Paystack needs one. */
    emailDomain: string;
  };
  claude: {
    enabled: boolean;
    model: string;
  };
  airtable: {
    token?: string;
    baseId?: string;
  };
  /** Local JSON store used when Airtable is not configured. */
  dataFile: string;
};

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.replace(/[^\d]/g, ""))
    .filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    businessName: env.BUSINESS_NAME ?? "our shop",
    publicUrl: env.PUBLIC_URL?.replace(/\/$/, ""),
    staffNumbers: list(env.STAFF_WHATSAPP_NUMBERS),
    whatsapp: {
      token: env.WHATSAPP_TOKEN,
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      verifyToken: env.WHATSAPP_VERIFY_TOKEN,
      appSecret: env.WHATSAPP_APP_SECRET,
      graphVersion: env.WHATSAPP_GRAPH_VERSION ?? "v21.0",
    },
    paystack: {
      secretKey: env.PAYSTACK_SECRET_KEY,
      emailDomain: env.ORDER_EMAIL_DOMAIN ?? "orders.example.com",
    },
    claude: {
      enabled: Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN),
      model: env.CLAUDE_MODEL ?? "claude-opus-5-5",
    },
    airtable: {
      token: env.AIRTABLE_TOKEN,
      baseId: env.AIRTABLE_BASE_ID,
    },
    dataFile: env.DATA_FILE ?? "data/store.local.json",
  };
}
