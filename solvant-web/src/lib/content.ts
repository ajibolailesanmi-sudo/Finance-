// ============================================================================
// SINGLE SOURCE OF TRUTH for copy, pricing, and founder-supplied [FILL] values.
// Edit this file to change site text — components read from here.
// Search this file for "[FILL" to find everything the founder must supply.
// ============================================================================

/** The one booking URL used by every CTA (brief §3). Set NEXT_PUBLIC_BOOKING_URL in the env. */
export const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL || "[FILL: Cal.com booking URL]";

/** True when a real booking URL is configured (used to avoid shipping a dead link). */
export const BOOKING_CONFIGURED = !BOOKING_URL.startsWith("[FILL");

export const CTA_LABEL = "Book a 15-minute intro call";

export const CONTACT = {
  email: "[FILL: contact email]",
  address: "[FILL: business mailing address]",
};

export const HERO = {
  eyebrow: "AI automation studio · US small business",
  headline: "Your business, running while you're not watching it.",
  subhead:
    "Solvant Labs builds AI agents and automations for small businesses: answering leads in seconds, chasing paperwork, and keeping your operations moving after hours.",
  secondary: "See what we build",
};

// Rotating hero schematic — proves ANY workflow, not just leads. Node 2 is always "Agent".
export const FLOWS = [
  { a: ["new lead", "update", "send"], n: ["Lead in", "Agent", "CRM", "Reply sent"], c: "a lead answered in seconds — while you're doing something else" },
  { a: ["invoice in", "extract", "post"], n: ["Invoice", "Agent", "Books", "Filed"], c: "paperwork read, posted, and filed — untouched by hand" },
  { a: ["request", "triage", "route"], n: ["Request", "Agent", "Team", "Handled"], c: "work triaged and routed the moment it arrives" },
  { a: ["booking", "confirm", "remind"], n: ["Booking", "Agent", "Calendar", "Confirmed"], c: "appointments booked and confirmed after hours" },
];

export const PROBLEMS = [
  { k: "01 / speed", t: "Leads that wait an hour go cold. Most small businesses reply in four." },
  { k: "02 / double entry", t: "Your team retypes the same information into three systems." },
  { k: "03 / after hours", t: "After 6 PM, your business stops answering. Your competitors' agents don't." },
];

export const SERVICES_LEDE =
  "Any repeatable workflow in your business — lead follow-up, document processing, scheduling, internal operations. Three ways to start.";

export const SERVICES = [
  {
    tier: "Pilot Automation",
    price: "from $500 · fixed",
    heading: "One workflow, live in a week",
    blurb:
      "One high-impact workflow, built and live within a week — instant lead reply, invoice intake, status updates, review requests, or appointment reminders.",
    includes: [
      "Any one workflow — lead reply, invoice intake, status updates, reminders",
      "Built and live within a week",
      "Documentation you can keep",
      "A handoff walkthrough so your team knows how it works",
    ],
    ideal: "Ideal for: a first, concrete win without a big commitment.",
    feature: false,
  },
  {
    tier: "Custom AI Agent",
    price: "from $1,500 · fixed",
    heading: "A multi-step agent for your operations",
    blurb:
      "A multi-step agent built around your operations: AI phone or chat reception, document intake and summarization, CRM updates, quoting workflows. Includes error handling, testing, and 30 days of post-launch fixes.",
    includes: [
      "AI phone or chat reception",
      "Document intake and summarization",
      "CRM updates and quoting workflows",
      "Error handling and testing against real scenarios",
      "30 days of post-launch fixes",
    ],
    ideal: "Ideal for: a recurring, multi-step process you want off your plate.",
    feature: true,
  },
  {
    tier: "Care Plan",
    price: "from $300 / month",
    heading: "We keep it running",
    blurb:
      "We keep your automations running: monitoring, fixes when integrations change, monthly improvements, and priority support. Month to month, cancel anytime.",
    includes: [
      "Monitoring so problems are caught before you notice them",
      "Fixes when integrations or APIs change",
      "Monthly improvements as your business shifts",
      "Priority support",
      "Month to month — cancel anytime",
    ],
    ideal: "Ideal for: keeping live automations dependable over time.",
    feature: false,
  },
];

export const SERVICES_NOTE =
  "Not sure which fits? That's what the intro call is for. No pitch deck, just a conversation about your operations.";

export const STEPS = [
  {
    k: "Step 01 · Map",
    t: "Map",
    p: "A 15-minute call, then a short written plan: what we'd automate first, what it costs, what it saves.",
    detail: ["What we'd automate first", "What it costs", "What it saves"],
  },
  {
    k: "Step 02 · Build",
    t: "Build",
    p: "We build fast, test against real scenarios, and show you everything before it goes live.",
    detail: ["Tested against real scenarios", "You see everything before go-live", "Error handling built in"],
  },
  {
    k: "Step 03 · Run",
    t: "Run",
    p: "Your systems work around the clock. We watch them so you don't have to.",
    detail: ["Monitoring and alerts", "Fixes when integrations change", "Monthly improvements"],
  },
];

export const RIGOR = [
  { m: "Documented", t: "You own the manual", p: "Every automation ships with documentation and a walkthrough, so you're never dependent on a black box." },
  { m: "Tested", t: "Proven before live", p: "We test against real scenarios and edge cases — not a happy-path demo — before anything goes into production." },
  { m: "Monitored", t: "Watched after launch", p: "Integrations change. Monitoring catches problems before you do, and the Care Plan fixes them." },
];

// Work = real client engagements, names withheld. (Founder confirmed.)
export const CASES = [
  {
    tag: "Client engagement · name withheld",
    title: "Regulatory Intelligence Agent",
    problem: "Staying current on federal regulatory changes means manually scanning dense government publications.",
    built: "An autonomous agent that monitors the Federal Register API daily, filters for relevant rules, and delivers plain-language summaries.",
    stack: "[FILL: exact stack]",
    outcome: "[FILL: e.g., review time cut from X hours/week to Y minutes]",
  },
  {
    tag: "Client engagement · name withheld",
    title: "Job Application Copilot (human-in-the-loop)",
    problem: "High-volume job applications force a choice between speed and quality.",
    built: "An agent that discovers openings, scores fit, tailors materials, and pre-fills applications, with a human approving every submission.",
    stack: "[FILL: exact stack]",
    outcome: "[FILL: metric]",
  },
];

// Live web app to showcase (founder-supplied details).
export const APP = {
  tag: "Live web app",
  name: "[FILL: app name]",
  problem: "[FILL: what problem it solves]",
  built: "[FILL: what the app does]",
  stack: "[FILL: stack]",
  url: "https://app.hoatpen.com",
  urlLabel: "app.hoatpen.com",
};

export const FAQ = [
  { q: "How much does this cost?", a: "Three fixed prices: Pilot Automation from $500, Custom AI Agent from $1,500, and the Care Plan from $300/month. Fixed means you know the number before we start — no hourly surprises." },
  { q: "How long until something is live?", a: "A Pilot Automation is built and live within a week. Larger custom agents take longer, and we'll give you a real timeline in the written plan after the intro call." },
  { q: "What if an integration changes and something breaks?", a: "That's exactly what the Care Plan covers — monitoring, plus fixes when an API or integration changes. It's month to month, cancel anytime." },
  { q: "Do you only work with a specific industry?", a: "No. We build general automation for small service businesses — home services, clinics, law firms, real estate, agencies. The engineering discipline is the same regardless of industry." },
  { q: "Is my data safe?", a: "Automations are built with error handling and tested before launch, and we document exactly what each system touches. We'll cover specifics for your setup on the call." },
];

export const FINAL_CTA = {
  headline: "The intro call is 15 minutes.",
  sub: "You'll leave with at least one automation idea you can use, whether or not we work together.",
};

export const EXPECT = [
  "15 minutes, on your schedule — pick a slot that works.",
  "A real conversation about your operations, not a pitch deck.",
  "At least one concrete automation idea you can act on.",
  "A short written plan afterward if it's a fit: what to automate first, cost, and savings.",
];
