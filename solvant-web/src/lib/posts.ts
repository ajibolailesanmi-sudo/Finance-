// ============================================================================
// Insights — Solvant Labs blog posts. Original content; add new entries here.
// Each post renders at /insights/<slug>. Keep the newest first.
// ============================================================================

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export type Post = {
  slug: string;
  title: string;
  dek: string; // one-line summary shown on the card and under the title
  date: string; // ISO date, e.g. "2026-11-05"
  author: string;
  readMins: number;
  body: Block[];
};

export const POSTS: Post[] = [
  {
    slug: "speed-is-the-cheapest-advantage",
    title: "Speed is the cheapest advantage you're not using",
    dek: "The first business to reply usually wins the job. Minutes matter more than polish — and you can answer every lead instantly without hiring anyone.",
    date: "2026-11-05",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "Here's an uncomfortable truth about inbound leads: most of the decision happens before you've even seen the message. When someone fills out a form or sends a text, they're usually contacting more than one business at once. Attention fades fast, and the shop that answers first is the one that gets to have the conversation at all.",
      },
      {
        type: "p",
        text: "You don't beat that with a better pitch. You beat it by being first — and being first is a speed problem, not a sales problem.",
      },
      { type: "h2", text: "Why the window is so short" },
      {
        type: "p",
        text: "A new lead is at peak interest the moment they hit send. Every minute after that, the interest cools: they get distracted, they hear back from a competitor, they talk themselves out of it. An hour later, the same lead is a fraction as likely to answer the phone. Replying \"later today\" often means replying after the decision's already been made.",
      },
      {
        type: "p",
        text: "For a small team this is brutal, because you can't sit on the inbox all day. You're on a job, with a patient, in court, on site. The lead arrives at 7:40 PM and sits there until morning.",
      },
      { type: "h2", text: "What an instant reply actually looks like" },
      {
        type: "p",
        text: "The fix isn't a human glued to a screen. It's a simple agent that answers the moment a lead comes in — on your website, by text, over WhatsApp — and does three things well:",
      },
      {
        type: "ul",
        items: [
          "Acknowledges the person by name and confirms you got their request, in seconds.",
          "Asks one or two qualifying questions so the follow-up is already useful.",
          "Books a time or hands off to a human, with everything logged where your team can see it.",
        ],
      },
      {
        type: "p",
        text: "That's it. It doesn't need to be clever. It needs to be instant, accurate, and honest about being an assistant — not a human pretending to be one.",
      },
      { type: "h2", text: "The one rule: don't fake it" },
      {
        type: "p",
        text: "An instant auto-reply only helps if it's truthful. Say it's an assistant, keep its promises small, and make sure a real person actually follows through on what it sets up. A fast reply that over-promises is worse than a slow one.",
      },
      {
        type: "p",
        text: "Speed is the rare advantage that's cheap to build and hard for a competitor to copy overnight. If leads are slipping through after hours, that's the first thing worth fixing.",
      },
    ],
  },
  {
    slug: "what-to-automate-first",
    title: "What to automate first (and what to leave alone)",
    dek: "You don't need an AI strategy. You need to find the one task your team repeats all day that a computer should be doing instead.",
    date: "2026-10-28",
    author: "Solvant Labs",
    readMins: 5,
    body: [
      {
        type: "p",
        text: "\"We should use AI\" is not a plan. It's a mood. The businesses that get real value from automation don't start with the technology — they start with a single, specific, annoying task and take it off a human's plate for good.",
      },
      {
        type: "p",
        text: "So how do you pick the first one? Look for the task that sits in the sweet spot of three things: it happens often, it follows rules, and it has a clear trigger.",
      },
      { type: "h2", text: "Happens often" },
      {
        type: "p",
        text: "Automating something you do twice a month isn't worth it — you'll spend more time building it than you'll ever save. Go after the thing that happens ten times a day: the new-lead reply, the appointment reminder, the status update, the invoice that has to be typed into a second system.",
      },
      { type: "h2", text: "Follows rules" },
      {
        type: "p",
        text: "Good first candidates have an answer you could write down. \"When a lead comes in, reply, tag it, and route it to the right rep.\" \"When an invoice arrives, pull these fields and post them to the books.\" If a new hire could learn it from a one-page checklist, a computer can do it reliably.",
      },
      { type: "h2", text: "Has a clear trigger" },
      {
        type: "p",
        text: "The best automations start the instant something happens: a form is submitted, an email lands, a booking is made. A clear trigger means the work starts on its own — no one has to remember to kick it off.",
      },
      { type: "h2", text: "What to leave alone (for now)" },
      {
        type: "p",
        text: "Resist the urge to automate the hard, fuzzy, judgment-heavy stuff first. Those projects are where enthusiasm goes to die. Leave these for later:",
      },
      {
        type: "ul",
        items: [
          "Work that needs real human judgment or a relationship — closing a big deal, handling an upset customer.",
          "Rare edge cases that change every time — you'll spend forever covering exceptions.",
          "Anything where a wrong answer is expensive and hard to catch, until you've built the monitoring to catch it.",
        ],
      },
      {
        type: "p",
        text: "Start with one boring, frequent, rule-shaped task. Get it live, watch it for a couple of weeks, and let it prove itself. Then do the next one. That's how a business ends up running on autopilot — not with a grand strategy, but with a stack of small wins that each paid for themselves.",
      },
    ],
  },
  {
    slug: "it-usually-works-is-not-a-standard",
    title: "\"It usually works\" is not a standard",
    dek: "Most automations break quietly when an integration changes. The difference between a demo and a dependable system is everything you can't see.",
    date: "2026-10-20",
    author: "Solvant Labs",
    readMins: 5,
    body: [
      {
        type: "p",
        text: "A demo is easy. You run the happy path once, it works, everyone claps. Production is different. Production is the same automation running a thousand times, on real inputs, at 2 AM, three months later, after an app it depends on quietly changed how it works.",
      },
      {
        type: "p",
        text: "The gap between those two is where most small-business automations fail — not loudly, but silently. It stops firing, nobody notices for a week, and by the time someone does, a pile of leads or invoices has fallen on the floor.",
      },
      { type: "h2", text: "Where automations actually break" },
      {
        type: "p",
        text: "It's rarely the clever part that fails. It's the plumbing:",
      },
      {
        type: "ul",
        items: [
          "An integration changes its API or login, and the connection goes dead.",
          "A rate limit or outage makes a step fail, and there's no retry.",
          "A weird input shows up — an empty field, an emoji, a 40-page PDF — that the happy-path demo never saw.",
          "Something succeeds halfway and leaves the data in a confusing in-between state.",
        ],
      },
      {
        type: "p",
        text: "None of these show up in a five-minute demo. All of them show up eventually in production.",
      },
      { type: "h2", text: "What dependable actually requires" },
      {
        type: "p",
        text: "The boring work is the valuable work. A system you can rely on has three things a demo doesn't:",
      },
      {
        type: "ul",
        items: [
          "Error handling — when a step fails, it retries or raises a flag instead of silently giving up.",
          "Testing against real scenarios and edge cases, not just the one input that looks good on screen.",
          "Monitoring — something is watching, so a break gets caught before you lose a week of work to it.",
        ],
      },
      { type: "h2", text: "Questions to ask whoever builds yours" },
      {
        type: "p",
        text: "Whether it's us or anyone else, it's fair to ask: What happens when this step fails? How will I know if it stops working? What did you test it against? If the answer is a shrug, you're buying a demo, not a system.",
      },
      {
        type: "p",
        text: "We come at this from years of regulated quality-operations work, where \"it usually works\" was never an acceptable answer. The same discipline is what makes automation something you can actually forget about — in the good way.",
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Human-readable date, e.g. "November 5, 2026". */
export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
