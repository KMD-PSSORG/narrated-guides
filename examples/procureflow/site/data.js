// Fictional people, items and requisitions. Fixed dates and amounts, so
// every recording of the guide looks the same.

export const TODAY = "2026-10-09";

export const PEOPLE = {
  requester: { id: "mette", name: "Mette Holm", title: "Team Lead, Payroll Operations", initials: "MH" },
  approver: { id: "henrik", name: "Henrik Dal", title: "Head of Payroll Operations", initials: "HD" },
};

export const CATALOGUE = [
  {
    id: "stapler-standard",
    name: "Stapler, standard (black)",
    price: 89,
    supplier: "Office Supplies Nordic A/S",
    lead: "3–5 business days*",
    note: "*Business days as defined by Procurement.",
    tags: ["stapler"],
  },
  {
    id: "stapler-red",
    name: "Stapler, red",
    price: 129,
    supplier: "Swingline Heritage",
    lead: "Discontinued 1998",
    note: "Still requested weekly.",
    unavailable: true,
    tags: ["stapler"],
  },
  {
    id: "stapler-heavy",
    name: "Stapler, heavy duty (240 sheets)",
    price: 1249,
    supplier: "Office Supplies Nordic A/S",
    lead: "6–8 weeks",
    note: "Requires CFO approval. And a reason.",
    tags: ["stapler"],
  },
  {
    id: "staples",
    name: "Staples, 24/6, 5,000 pcs",
    price: 24,
    supplier: "Office Supplies Nordic A/S",
    lead: "3–5 business days*",
    note: "Sold separately. Obviously.",
    tags: ["stapler", "staples"],
  },
  {
    id: "postit-yellow",
    name: "Sticky notes, yellow, 12 pads",
    price: 45,
    supplier: "Office Supplies Nordic A/S",
    lead: "3–5 business days*",
    note: "Other colours require Brand approval.",
    tags: ["notes", "post-it"],
  },
  {
    id: "chair",
    name: "Ergonomic office chair",
    price: 6995,
    supplier: "SitWell ApS",
    lead: "Q3 2027",
    note: "Requires an occupational health assessment and a second chair to compare with.",
    tags: ["chair"],
  },
  {
    id: "coffee",
    name: "Coffee beans, 1 kg",
    price: 189,
    supplier: "Bean There Done That",
    lead: "Escalated",
    note: "Handled by the Coffee Committee. Meets quarterly.",
    tags: ["coffee"],
  },
];

export const COST_CENTRES = [
  {
    id: "4100",
    name: "4100 – Payroll Operations",
    budget: 50000,
    committed: 49987.6,
    account: "6110 – Office supplies",
  },
  {
    id: "4200",
    name: "4200 – Strategic Initiatives",
    budget: 250000,
    committed: 250000,
    account: "6900 – Synergies",
    frozen: true,
  },
  {
    id: "9999",
    name: "9999 – Miscellaneous (please don't)",
    budget: 1000,
    committed: 0,
    account: "6999 – Other",
    discouraged: true,
  },
];

export const JUSTIFICATION_MIN = 200;

export const CHAIN = [
  { role: "Line manager", name: "Henrik Dal", initials: "HD", eta: "2–4 days" },
  { role: "Budget owner", name: "Susanne Krog", initials: "SK", eta: "1–3 weeks", reason: "Budget exception" },
  { role: "Procurement", name: "Procurement Team", initials: "PT", eta: "Whenever" },
  {
    role: "Final approval",
    name: "Bent",
    initials: "B",
    eta: "Instant",
    id: "bent",
    note: "Bent has approved every requisition since 2004. Nobody knows why. Nobody asks.",
  },
];

export const NEW_REQUISITION_ID = "REQ-2026-000417";

export const REQUISITIONS = [
  {
    id: "REQ-2026-000388",
    item: "Whiteboard markers, 4 colours",
    submitted: "2026-08-14",
    amount: 64,
    status: "Awaiting approval",
    detail: "With Procurement since August. They are reviewing the colours.",
  },
  {
    id: "REQ-2026-000301",
    item: "Coffee beans, 1 kg",
    submitted: "2026-05-02",
    amount: 189,
    status: "Escalated",
    detail: "Escalated to the Coffee Committee. Next meeting: to be decided.",
  },
  {
    id: "REQ-2025-000211",
    item: "Second monitor, 27\"",
    submitted: "2025-11-20",
    amount: 2199,
    status: "Rejected",
    detail: "Rejected by Budget owner: \"One is plenty.\"",
  },
  {
    id: "REQ-2025-000097",
    item: "Desk plant (artificial)",
    submitted: "2025-03-11",
    amount: 149,
    status: "Delivered",
    detail: "Delivered after 211 days. Already dead, somehow.",
  },
];

export const APPROVAL_QUEUE = [
  {
    id: "REQ-2026-000402",
    item: "Ergonomic office chair",
    requester: "Kasper Lund",
    amount: 6995,
    waiting: "12 days",
    justification: "My current chair has three wheels and a political opinion.",
  },
  {
    id: "REQ-2026-000399",
    item: "Sticky notes, yellow, 12 pads",
    requester: "Anja Brix",
    amount: 45,
    waiting: "19 days",
    justification: "Needed to write down all the things I am waiting for.",
  },
];

export const ARCHIVE = [
  {
    id: "REQ-2009-000774",
    item: "Fax machine toner",
    requester: "Former employee",
    submitted: "2009-02-02",
    status: "Delivered (2014)",
  },
  {
    id: "REQ-1999-000042",
    item: "Y2K survival kit",
    requester: "IT Department",
    submitted: "1999-12-30",
    status: "Not needed, as it turned out",
  },
  {
    id: "REQ-1987-000013",
    item: "Pumpkin, carved (1 pc)",
    requester: "G. Gourdon",
    submitted: "1987-10-31",
    status: "Awaiting approval",
    haunted: true,
  },
];

export const ANNOUNCEMENTS = [
  "The coffee machine has been escalated to Procurement. ETA: Q3 2028.",
  "Reminder: \"ASAP\" is not a valid delivery date. Please select a quarter.",
  "New policy: requisitions for paper clips now require a business justification of at least 200 characters.",
  "The approval chain has been optimised. It now has one more step.",
  "Bent has approved 14,203 requisitions. Bent has not been seen in the office since 2011.",
  "Spooky season is here. Please do not open requisitions older than 1990.",
];

export const ACTIVITY = [
  { when: "Today, 09:12", text: "Your requisition REQ-2026-000388 was viewed by Procurement. Nothing else happened." },
  { when: "Yesterday", text: "Henrik Dal asked for more justification on a requisition for justification templates." },
  { when: "Monday", text: "Bent approved 41 requisitions in 3 seconds." },
];

export const HELP_ARTICLES = [
  { title: "Requesting a stapler", kind: "Video guide", minutes: 4, video: true },
  { title: "Understanding the approval chain (and Bent)", kind: "Article", minutes: 7 },
  { title: "Writing a business justification that passes compliance", kind: "Article", minutes: 12 },
  { title: "What to do while you wait", kind: "Article", minutes: 240 },
  { title: "Requisitions older than 1990: please don't", kind: "Notice", minutes: 1 },
];
