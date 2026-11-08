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
    slug: "ai-or-just-automation",
    title: "AI or just automation? Knowing which you actually need",
    dek: "Not every problem needs AI. Sometimes plain automation is cheaper, more reliable, and exactly right. Here's how to tell them apart.",
    date: "2026-11-06",
    author: "Solvant Labs",
    readMins: 5,
    body: [
      {
        type: "p",
        text: "“AI” is the word on every pitch right now, which makes it easy to assume every problem needs it. A lot of the time, it doesn't. Plenty of the most valuable automation is just plumbing — moving information from one place to another, on a trigger, by rules. Knowing when you need the smart stuff and when you don't will save you money and headaches.",
      },
      { type: "h2", text: "When plain automation is the right tool" },
      {
        type: "p",
        text: "If the task has a clear, rules-based answer — when this happens, do that — you usually don't need AI at all. Routing a lead, syncing a field between apps, sending a reminder, posting an invoice with known fields: these are predictable. Plain automation does them faster, cheaper, and more reliably than a model would, and it doesn't surprise you.",
      },
      { type: "h2", text: "When AI actually earns its place" },
      {
        type: "ul",
        items: [
          "Understanding messy, free-form language — a customer's question, an email's intent.",
          "Reading an unstructured document and pulling out what matters.",
          "Summarizing, classifying, or drafting a reply for a human to approve.",
        ],
      },
      { type: "h2", text: "Most real systems are both" },
      {
        type: "p",
        text: "In practice the best builds mix the two: AI handles the fuzzy, human-shaped parts, and plain automation handles the reliable plumbing around it. The right question isn't “how do we use AI?” It's “what's the simplest thing that solves this?” Sometimes that's an agent. Often it's a rule. A good builder will tell you which — and won't sell you a model you didn't need.",
      },
    ],
  },
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
        text: "A new lead is at peak interest the moment they hit send. Every minute after that, the interest cools: they get distracted, they hear back from a competitor, they talk themselves out of it. An hour later, the same lead is far less likely to answer the phone. Replying “later today” often means replying after the decision's already been made.",
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
    slug: "the-9pm-lead",
    title: "The 9 PM lead: where after-hours inquiries really go",
    dek: "Most inquiries don't arrive during business hours. Here's what happens to the ones that land after you've closed — and how to stop losing them.",
    date: "2026-11-02",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "A lot of owners picture their leads arriving between nine and five, when someone's at the desk to catch them. In reality, plenty come in exactly when you can't answer: evenings, weekends, lunch breaks, the middle of a job. People research and reach out on their own schedule, and that's usually after yours ends.",
      },
      {
        type: "p",
        text: "So the 9 PM lead sits. It waits in a form submission or an unread text until the next morning — and by then the person has often moved on, or someone else got back to them first.",
      },
      { type: "h2", text: "Why after-hours is where you quietly lose" },
      {
        type: "p",
        text: "Two things work against you overnight. The person is at peak intent when they send the message, and that fades by morning. And they rarely contact just one business, so the clock is really a race. Whoever replies first gets the conversation; everyone else gets silence.",
      },
      { type: "h2", text: "What “always on” actually means" },
      {
        type: "p",
        text: "It doesn't mean you answering the phone at midnight. It means a simple agent catches the inquiry the moment it lands — on your site, by text, over WhatsApp — confirms you got it, answers the obvious questions, and books a time or flags it for the morning. The person feels handled; you follow up rested.",
      },
      {
        type: "ul",
        items: [
          "Instant acknowledgement, so they stop shopping around.",
          "Answers to the handful of questions you get every single time.",
          "A booked slot or a clean handoff waiting for you at 8 AM.",
        ],
      },
      { type: "h2", text: "The honest version" },
      {
        type: "p",
        text: "Be upfront that it's an assistant, keep its promises small, and make sure a human actually follows through. An after-hours reply that over-promises is worse than none. Done right, “we're closed” stops costing you the job.",
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
        text: "“We should use AI” is not a plan. It's a mood. The businesses that get real value from automation don't start with the technology — they start with a single, specific, annoying task and take it off a human's plate for good.",
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
        text: "Good first candidates have an answer you could write down. “When a lead comes in, reply, tag it, and route it to the right rep.” “When an invoice arrives, pull these fields and post them to the books.” If a new hire could learn it from a one-page checklist, a computer can do it reliably.",
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
    slug: "what-an-ai-receptionist-can-do",
    title: "What an AI receptionist can actually do (and what it can't)",
    dek: "\"AI receptionist\" gets thrown around a lot. Here's a grounded look at what one genuinely handles today — and where you still want a human.",
    date: "2026-10-25",
    author: "Solvant Labs",
    readMins: 5,
    body: [
      {
        type: "p",
        text: "The phrase “AI receptionist” can mean anything from a glorified voicemail to a system that books appointments and updates your CRM. Before you buy one, it helps to separate what this technology reliably does from what it's still bad at.",
      },
      { type: "h2", text: "What it does well" },
      {
        type: "ul",
        items: [
          "Answers instantly, every time, on chat or by phone — no hold music, no missed call.",
          "Handles the repetitive questions: hours, location, pricing ranges, what to bring, whether you serve their area.",
          "Captures the caller's details and reason for contact, and logs it where your team can see it.",
          "Books, reschedules, or cancels against a real calendar.",
          "Routes anything it can't handle to the right person, with context attached.",
        ],
      },
      { type: "h2", text: "Where a human still wins" },
      {
        type: "p",
        text: "An agent shouldn't be the one calming an upset customer, making a judgment call on a complicated job, or closing a high-stakes deal. Those need a person. The goal isn't to replace your front desk — it's to stop the front desk from drowning in the routine so the human time goes where it matters.",
      },
      { type: "h2", text: "The two rules that keep it from backfiring" },
      {
        type: "ul",
        items: [
          "Be honest that it's an assistant. People forgive a bot; they don't forgive being tricked.",
          "Give it clear limits and a clean handoff. A confident wrong answer is worse than “let me get someone who can help.”",
        ],
      },
      {
        type: "p",
        text: "Used that way, an AI receptionist isn't a gimmick — it's the thing that answers the call you would've missed, at a cost that makes sense for a small business.",
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
      { type: "p", text: "It's rarely the clever part that fails. It's the plumbing:" },
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
        text: "We come at this from years of regulated quality-operations work, where “it usually works” was never an acceptable answer. The same discipline is what makes automation something you can actually forget about — in the good way.",
      },
    ],
  },
  {
    slug: "stop-retyping",
    title: "Stop retyping: the hidden tax of double data entry",
    dek: "If your team enters the same information into two or three systems, you're paying a tax in hours and errors. It's one of the easiest things to automate away.",
    date: "2026-10-16",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "Here's a workflow almost every small business has, and almost nobody notices: a piece of information arrives, and then a human copies it, by hand, from one place to another. A lead's details go from the form into the CRM and then into the quoting tool. An invoice's numbers go from a PDF into the accounting system. The same name, typed three times, three chances to fumble it.",
      },
      { type: "h2", text: "Why it's worse than it looks" },
      {
        type: "p",
        text: "Double entry costs more than the minutes. Every manual copy is a chance to transpose a digit, miss a field, or forget a step entirely. And it's the kind of boring work people put off, so it piles up — which means your systems are out of sync exactly when you need them to be right.",
      },
      { type: "h2", text: "What automating it looks like" },
      {
        type: "p",
        text: "The fix is unglamorous and high-value: when information lands in one system, it flows to the others automatically, with the fields mapped correctly and the edge cases handled. A lead comes in once and shows up everywhere it needs to. An invoice is read and posted without anyone typing.",
      },
      {
        type: "ul",
        items: [
          "One source of truth, synced automatically instead of by hand.",
          "Fewer typos and dropped fields, because the computer doesn't get bored.",
          "Hours a week back for work that actually needs a person.",
        ],
      },
      {
        type: "p",
        text: "It's not exciting, but it's often the first automation that pays for itself — and the one your team thanks you for.",
      },
    ],
  },
  {
    slug: "fixed-price-vs-hourly",
    title: "Fixed price vs. hourly: why we quote automation up front",
    dek: "Hourly billing quietly puts a builder's inefficiency on your tab. Here's why we price automation as a fixed number — and what that protects.",
    date: "2026-10-10",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "When you hire someone to automate part of your business, how they bill you matters more than it seems. Hourly sounds fair — you pay for the work done. In practice, it puts the risk on you: if the build takes longer, drifts in scope, or hits a snag, your bill grows, and you don't find out until it arrives.",
      },
      { type: "h2", text: "What fixed price changes" },
      {
        type: "p",
        text: "A fixed price flips the risk. You know the number before anything starts. If a build turns out harder than expected, that's the builder's problem to solve, not a surprise line on your invoice. It forces a clear scope up front — what you're getting, for what price — instead of an open-ended meter.",
      },
      { type: "h2", text: "What it protects you from" },
      {
        type: "ul",
        items: [
          "Scope creep you didn't ask for and can't predict.",
          "“It took longer than we thought” landing on your bill.",
          "The anxiety of not knowing what the final number will be.",
        ],
      },
      { type: "h2", text: "The tradeoff, honestly" },
      {
        type: "p",
        text: "Fixed pricing means the scope has to be clear before work starts, so there's a real conversation up front about what the automation will and won't do. That's a feature: it means you both know what success looks like. For anything well-defined — a workflow, an agent, a specific integration — a fixed price is the fairer deal for the person buying it.",
      },
    ],
  },
  {
    slug: "start-with-a-pilot",
    title: "Start with a pilot: the case for automating one thing first",
    dek: "The fastest way to waste money on automation is to try to do everything at once. Start with one workflow, prove it, then expand.",
    date: "2026-10-05",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "When a business finally decides to automate, the temptation is to map the whole operation and build it all. That's how projects balloon, slip, and quietly get abandoned. The better move is almost boringly simple: pick one workflow, get it live, and let it earn trust before you do anything else.",
      },
      { type: "h2", text: "Why one thing first wins" },
      {
        type: "ul",
        items: [
          "You see real value in days, not months.",
          "You learn how your own data and tools actually behave before betting big on them.",
          "If it's wrong, it's cheap and quick to fix — not a giant project to unwind.",
        ],
      },
      { type: "h2", text: "What makes a good pilot" },
      {
        type: "p",
        text: "The best first automation is high-impact and well-defined: instant lead reply, invoice intake, appointment reminders, review requests. Something that happens often, follows clear rules, and has an obvious trigger. Narrow enough to build and test quickly, useful enough that you'd miss it if it broke.",
      },
      { type: "h2", text: "Then expand on proof, not hope" },
      {
        type: "p",
        text: "Once the pilot's been running and you trust it, the next automation is an easy call — you've seen the payoff and you know the terrain. A business ends up running on autopilot not from one grand build, but from a stack of small wins that each paid for themselves. Start with one.",
      },
    ],
  },
  {
    slug: "integrations-change",
    title: "Integrations change. Your automation shouldn't silently die.",
    dek: "The apps your automation depends on update, deprecate, and break — often without warning. Monitoring is the difference between a blip and a lost week.",
    date: "2026-09-28",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "An automation is only as stable as the things it connects to. Your CRM, your inbox, your scheduling tool, the payment system — they all change on their own timelines. An API gets updated, a login expires, a field gets renamed, and suddenly the quiet machine that's been running your follow-ups just… stops.",
      },
      { type: "h2", text: "The dangerous part is the silence" },
      {
        type: "p",
        text: "The failure itself isn't the problem. The problem is nobody notices. An automation that breaks loudly gets fixed. An automation that breaks silently drops leads, skips invoices, and misses reminders for a week before someone realizes the pipeline's been empty for the wrong reason.",
      },
      { type: "h2", text: "What monitoring actually buys you" },
      {
        type: "ul",
        items: [
          "Something is watching, so a break gets caught in hours, not weeks.",
          "Alerts go to a human before a customer feels the gap.",
          "When an integration changes, the fix happens on purpose — not after the damage.",
        ],
      },
      { type: "h2", text: "Why we treat it as ongoing" },
      {
        type: "p",
        text: "This is exactly why we offer a care plan rather than build-and-vanish. “Set it and forget it” is a nice slogan, but real systems need someone keeping an eye on them. The automation you can actually forget about is the one somebody else is quietly watching.",
      },
    ],
  },
  {
    slug: "human-in-the-loop",
    title: "Human-in-the-loop: when your agent should ask first",
    dek: "Not every action should be fully automatic. The best agents know when to act, and when to stop and get a human's sign-off.",
    date: "2026-09-22",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "There's a myth that a good automation does everything by itself. For a lot of tasks, the better design keeps a human in the loop — the agent does the work, but a person approves the part that matters before it goes out.",
      },
      { type: "h2", text: "Where full autonomy is fine" },
      {
        type: "p",
        text: "Low-stakes, reversible, high-frequency actions are great candidates for hands-off automation: sending an acknowledgement, logging a lead, tagging an email, posting a routine update. If a mistake is cheap and easy to catch, let the machine run.",
      },
      { type: "h2", text: "Where you want a sign-off" },
      {
        type: "ul",
        items: [
          "Anything sent to a customer in your name that carries real weight — a quote, a legal-sounding reply, a refund.",
          "Actions that are hard to undo or expensive if wrong.",
          "Judgment calls that depend on context the agent can't fully see.",
        ],
      },
      {
        type: "p",
        text: "For those, the agent should draft, prepare, and tee up the work — then wait. A person clicks approve. You keep the speed of automation without handing over the decisions that should stay yours.",
      },
      { type: "h2", text: "The point" },
      {
        type: "p",
        text: "Human-in-the-loop isn't a limitation; it's good engineering. It's how you get the leverage of an agent without lying awake wondering what it sent while you were asleep.",
      },
    ],
  },
  {
    slug: "cut-no-shows-with-reminders",
    title: "Cut no-shows with reminders that actually get read",
    dek: "A missed appointment is paid-for time that vanishes. Automated reminders are one of the simplest ways to protect your schedule.",
    date: "2026-09-15",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "For any business that runs on appointments — clinics, salons, trades, consultations — a no-show is pure loss. The slot was reserved, the time was blocked, and nobody filled it. Most no-shows aren't people flaking; they're people forgetting. Which means they're mostly preventable.",
      },
      { type: "h2", text: "Why reminders work (when they're done right)" },
      {
        type: "p",
        text: "A good reminder lands where the person actually looks — usually a text, not an email buried under fifty others — at the right moments: a confirmation when they book, a nudge the day before, a short one the morning of. Enough to jog memory, not so much it becomes noise they tune out.",
      },
      { type: "h2", text: "The part people skip" },
      {
        type: "ul",
        items: [
          "Make it easy to confirm, reschedule, or cancel right from the reminder.",
          "A cancellation you get a day early is a slot you can refill. A silent no-show is a slot you lose.",
          "Keep the tone human and brief — a wall of text gets ignored.",
        ],
      },
      { type: "h2", text: "Set it once, keep the time back" },
      {
        type: "p",
        text: "The whole thing runs off your calendar automatically: book a slot, the reminders take care of themselves. No one on your team has to remember to send them, and your day stops springing empty holes you can't fill.",
      },
    ],
  },
  {
    slug: "get-more-reviews",
    title: "Get more reviews without nagging your customers",
    dek: "Reviews drive new business, but asking by hand is awkward and easy to forget. The ask works best when it's automatic and well-timed.",
    date: "2026-09-08",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "Online reviews are often the first thing a new customer checks, and more of them — recent, genuine — quietly win you work you never see. The problem is the asking. Done by hand, it's awkward, inconsistent, and the thing everyone forgets right when it matters.",
      },
      { type: "h2", text: "Timing beats persistence" },
      {
        type: "p",
        text: "The best moment to ask is right after a good experience, while the goodwill is fresh — the job's done, the visit went well, the problem's solved. Wait a week and the moment's gone. An automation catches that window every time, without anyone having to remember.",
      },
      { type: "h2", text: "How to ask without being annoying" },
      {
        type: "ul",
        items: [
          "One clear, friendly message at the right moment — not a drip campaign.",
          "Make leaving the review a single tap, not a scavenger hunt.",
          "Only ask customers who had a good experience; give unhappy ones a private way to reach you first.",
        ],
      },
      {
        type: "p",
        text: "That last point matters. The goal isn't to farm five-star ratings — it's to make it effortless for happy customers to say so, and to hear about unhappy ones before they post. Honest, well-timed, and automatic beats pushy and manual every time.",
      },
    ],
  },
  {
    slug: "document-intake",
    title: "From PDF to spreadsheet: automating document intake",
    dek: "Invoices, forms, and attachments still arrive as documents a human has to read and retype. That reading-and-typing is exactly what agents are good at now.",
    date: "2026-09-01",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "A surprising amount of small-business work is still someone opening a document, finding a few numbers or fields, and typing them into another system. Invoices, intake forms, receipts, order confirmations — they land as PDFs and emails, and a human becomes the bridge between the attachment and the software.",
      },
      { type: "h2", text: "Why this is a sweet spot for automation" },
      {
        type: "p",
        text: "Reading a document, pulling out the fields that matter, and putting them where they belong is repetitive, rule-shaped, and high-volume — the exact profile of a task worth handing to a computer. Modern agents are genuinely good at it: they can extract the line items, the dates, the amounts, and post them, without the boredom that makes people slip.",
      },
      { type: "h2", text: "What a dependable version includes" },
      {
        type: "ul",
        items: [
          "Extraction that handles the messy real-world versions, not just the clean sample.",
          "A check or a human sign-off where a wrong number would be expensive.",
          "A clear log of what it read and where it put it, so nothing's a black box.",
        ],
      },
      {
        type: "p",
        text: "Get this right and a daily pile of documents stops being someone's morning. The information arrives, gets read, and lands in the right place — and your team spends its attention on the work only a person can do.",
      },
    ],
  },
  {
    slug: "lead-routing",
    title: "The right lead to the right person, in seconds",
    dek: "When leads pile up, get duplicated, or reach the wrong rep, follow-up gets slow and uneven. Routing them automatically fixes all three.",
    date: "2026-08-25",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "As soon as a business gets more than a trickle of inbound, a new problem shows up: leads arrive faster than anyone can sort them. They land in a shared inbox, get picked up twice or not at all, and sometimes reach a rep who can't actually help. The result is slow, uneven follow-up — and leads that slip through the cracks between people.",
      },
      { type: "h2", text: "What routing actually does" },
      {
        type: "ul",
        items: [
          "Captures every lead in one place, the moment it arrives.",
          "Dedupes, so the same person isn't worked by two reps.",
          "Scores or sorts, so the hot ones get attention first.",
          "Assigns each to the right person automatically, with a nudge so it isn't missed.",
        ],
      },
      { type: "h2", text: "Speed and fairness at once" },
      {
        type: "p",
        text: "Good routing solves two things people usually trade off. It's faster — the lead reaches someone in seconds instead of sitting in a queue — and it's fairer, because assignment follows rules instead of whoever happens to be refreshing the inbox. Everything's logged, so you can see what came in and what happened to it.",
      },
      {
        type: "p",
        text: "For a growing team, this is often the automation that turns a messy pile of inbound into a pipeline you can actually trust.",
      },
    ],
  },
  {
    slug: "automation-for-home-and-trade-services",
    title: "Automation for home & trade services that pays for itself",
    dek: "For HVAC, plumbing, electrical, landscaping and the like, a few simple automations protect the jobs you're currently losing to a slow phone.",
    date: "2026-08-18",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "Home and trade businesses live and die on response time. The customer with a broken furnace or a leaking pipe calls three companies and goes with whoever answers first and shows up soonest. If you're on a job — which is most of the day — that first-to-answer advantage is exactly what you can't give.",
      },
      { type: "h2", text: "Where the money leaks" },
      {
        type: "ul",
        items: [
          "Calls and form fills that come in while you're on site, and sit until evening.",
          "Quote requests that cool off before you get back to them.",
          "Jobs that finish without ever asking the happy customer for a review.",
        ],
      },
      { type: "h2", text: "A few automations that fit the trade" },
      {
        type: "p",
        text: "None of this requires reinventing how you work. An agent can answer instantly, take the details, and book or flag the job while you're under a sink. Quote replies can go out fast with the basics already filled in. Reminders can cut the no-shows that waste a truck roll. And a review request can go out automatically after the job's done, while the customer's still happy.",
      },
      {
        type: "p",
        text: "For a small crew, these aren't luxuries — they're the difference between catching the next job and losing it to the shop that picked up the phone.",
      },
    ],
  },
  {
    slug: "front-desk-automation-for-clinics",
    title: "Front-desk automation for clinics, without cutting corners",
    dek: "Practices can automate booking, reminders, and intake to free up the front desk — as long as it's done carefully, with privacy front of mind.",
    date: "2026-08-11",
    author: "Solvant Labs",
    readMins: 5,
    body: [
      {
        type: "p",
        text: "A clinic's front desk is constantly interrupted: the phone rings while someone's checking in a patient, intake forms pile up, reminder calls eat the afternoon. A lot of that is automatable — but healthcare is exactly where “move fast and break things” is the wrong instinct. The automation has to be careful.",
      },
      { type: "h2", text: "What's safe to automate" },
      {
        type: "ul",
        items: [
          "Appointment booking, confirmations, rescheduling, and reminders.",
          "Answering the routine questions: hours, location, what to bring, insurance basics.",
          "Intake forms patients fill in ahead of time instead of on a clipboard in the waiting room.",
        ],
      },
      { type: "h2", text: "Where care matters most" },
      {
        type: "p",
        text: "Anything touching patient information needs to be handled deliberately: clear about what data is collected and where it goes, access limited to who should see it, and a human in the loop for anything clinical. This isn't the place for an agent to improvise medical answers — it books, reminds, and routes, and leaves the care to clinicians.",
      },
      {
        type: "p",
        text: "We're not a law firm and this isn't compliance advice — your practice knows its own obligations better than we do. The point is simply that front-desk automation and doing right by patients aren't in conflict. Done with care, it gives your staff their attention back and gives patients a smoother front door.",
      },
    ],
  },
  {
    slug: "client-intake-for-professional-services",
    title: "Client intake for law and professional services, minus the back-and-forth",
    dek: "The intake dance — forms, follow-ups, chasing documents — eats hours before a matter even starts. Most of it can run itself.",
    date: "2026-08-04",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "For law firms and professional-services practices, a lot of time disappears before the real work begins. A prospective client reaches out, and then comes the shuffle: send the intake form, wait, follow up, collect the documents, chase the missing ones, get it all into the system. It's necessary, repetitive, and a poor use of billable attention.",
      },
      { type: "h2", text: "What intake automation handles" },
      {
        type: "ul",
        items: [
          "A clean intake flow that collects what you need the first time.",
          "Automatic follow-ups for missing information or documents, so you're not chasing by hand.",
          "Everything landing in your system, organized, instead of scattered across email.",
          "Status updates to the client so they're not left wondering.",
        ],
      },
      { type: "h2", text: "Keeping the human judgment where it belongs" },
      {
        type: "p",
        text: "Automation handles the logistics — the collecting, the reminding, the organizing. It doesn't make the calls that need a professional: whether to take the matter, how to advise, what a situation actually requires. Those stay with you. The agent just clears the administrative runway so you reach the real work faster.",
      },
      {
        type: "p",
        text: "The result is a first impression that feels responsive and organized, and hours of coordination you get back every week.",
      },
    ],
  },
  {
    slug: "real-estate-never-miss-a-lead",
    title: "Real estate: never miss an inbound lead again",
    dek: "In real estate, speed to lead is everything, and inquiries never respect business hours. An always-on first response keeps deals from walking.",
    date: "2026-07-28",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "Real estate might be the clearest case of “the fastest reply wins.” A buyer or seller inquiring about a property is usually talking to several agents, and interest is highest the instant they reach out. An hour's delay often means the conversation's already happening with someone else.",
      },
      { type: "h2", text: "The problem with how leads arrive" },
      {
        type: "p",
        text: "Inquiries come from everywhere — portals, your site, texts, social — at all hours, often nights and weekends when you're showing, driving, or off. The lead that lands at 8 PM can't wait until morning without cooling, and the one that comes in during a showing can't wait until you're free.",
      },
      { type: "h2", text: "What an always-on front line does" },
      {
        type: "ul",
        items: [
          "Responds instantly to every inquiry, on any channel, day or night.",
          "Answers the basics and qualifies — budget, area, timeline — so your follow-up is already useful.",
          "Books the call or showing, and routes the lead to the right agent with context.",
          "Logs everything, so nothing gets lost between platforms.",
        ],
      },
      {
        type: "p",
        text: "It doesn't replace the relationship-building that closes deals — that's the part that needs you. It just makes sure you're the agent who answered first, which is often the only reason you get to build the relationship at all.",
      },
    ],
  },
  {
    slug: "is-your-automation-working",
    title: "How to tell if an automation is actually working",
    dek: "An automation can look fine and still be quietly underperforming. A few simple measures tell you whether it's really earning its keep.",
    date: "2026-07-21",
    author: "Solvant Labs",
    readMins: 4,
    body: [
      {
        type: "p",
        text: "You automated something. Great — but is it actually working? “It hasn't broken” isn't the same as “it's delivering.” An automation can run without errors and still be saving less time than it cost, or quietly mishandling the cases nobody checks. The only way to know is to decide up front what success looks like, then watch it.",
      },
      { type: "h2", text: "Measure the thing you were trying to fix" },
      {
        type: "p",
        text: "Tie the measure to the reason you built it. If it was about speed, track response time. If it was about dropped leads, track how many now get a reply. If it was about saving hours, track the time your team used to spend on it. Vague “it feels faster” isn't enough to know if it's worth keeping.",
      },
      { type: "h2", text: "A few signals worth watching" },
      {
        type: "ul",
        items: [
          "Is it actually faster or higher-volume than the manual version it replaced?",
          "How often does it hit a case it can't handle, and what happens then?",
          "Are the humans downstream trusting it, or quietly double-checking everything?",
        ],
      },
      { type: "h2", text: "Review, then adjust" },
      {
        type: "p",
        text: "The first version of an automation is rarely the final one. Watch it for a few weeks, see where it stumbles, and tighten it. The ones that deliver long-term aren't set-and-forgotten — they're measured, trusted, and improved. If no one can tell you whether yours is working, that's the first thing to fix.",
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Public path of a post's cover image (one generated per slug, in public/images/insights). */
export function coverFor(slug: string): string {
  return `/images/insights/v3/${slug}.png`;
}

/** Human-readable date, e.g. "November 5, 2026". */
export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
