export type ServiceKey = "freight" | "equipment" | "bus" | "onDemand";

export const SERVICES: ReadonlyArray<{ key: ServiceKey; title: string; summary: string; detail: string; tags: string[] }> = [
  {
    key: "freight",
    title: "Truck freight",
    summary: "Shared or dedicated loads from 50 kg between states",
    detail: "Tell us what you are moving and where. We match your load to verified trucks already running your route, so you pay for the space you use.",
    tags: ["Shared loads", "Dedicated trucks", "From 50 kg"],
  },
  {
    key: "equipment",
    title: "Heavy equipment haulage",
    summary: "Flatbeds and low-loaders for plant and machinery",
    detail: "Excavators, generators and site plant moved on trucks rated for the payload, with documents checked before they leave the yard.",
    tags: ["Flatbeds", "Low-loaders", "Rated payloads"],
  },
  {
    key: "bus",
    title: "Bus charter",
    summary: "Buses for staff, crews and group movement",
    detail: "Move site crews, staff and teams between states on vetted buses with assigned, licensed drivers.",
    tags: ["Crews", "Staff", "Groups"],
  },
  {
    key: "onDemand",
    title: "On-demand logistics",
    summary: "Book verified capacity when you need it",
    detail: "No contracts to sign up front. Search available trucks by route and pickup date, compare offers and book the one that fits.",
    tags: ["Search by route", "Compare offers", "Book in one flow"],
  },
];

export type IndustryKey = "construction" | "agriculture" | "manufacturing" | "retail";

export const INDUSTRIES: ReadonlyArray<{ key: IndustryKey; title: string; summary: string }> = [
  { key: "construction", title: "Construction", summary: "Materials, plant and site equipment" },
  { key: "agriculture", title: "Agriculture", summary: "Produce and inputs from farm to market" },
  { key: "manufacturing", title: "Manufacturing", summary: "Raw materials in, finished goods out" },
  { key: "retail", title: "Retail and distribution", summary: "Stock moved between warehouses and stores" },
];

export type Step = { title: string; detail: string };

export const SHIPPER_STEPS: ReadonlyArray<Step> = [
  { title: "Describe your load", detail: "Origin, destination, cargo type, weight from 50 kg and your pickup date." },
  { title: "Compare verified trucks", detail: "See eligible trucks on your route with the full, itemised price before you commit." },
  { title: "Confirm and pay", detail: "The vendor accepts, your payment is confirmed and the truck space is reserved for you." },
  { title: "Track to delivery", detail: "Follow every status from pickup to delivery, closed out with proof of delivery." },
];

export const VENDOR_STEPS: ReadonlyArray<Step> = [
  { title: "Create your account", detail: "Register as an individual owner, fleet operator or logistics company and verify your phone." },
  { title: "Get verified", detail: "Submit identity, business and truck documents for review by our operations team." },
  { title: "Publish your routes", detail: "Set the routes you run, departure dates, available capacity, your rate per tonne and any loading, offloading or toll charges." },
  { title: "Deliver and get paid", detail: "Accept bookings, assign drivers, record delivery and receive your payout." },
];

export const VENDOR_DOCUMENTS = [
  "Vehicle registration",
  "Proof of ownership or operating authority",
  "Roadworthiness certificate",
  "Valid insurance",
] as const;

export const BOOKING_STATUSES = ["Confirmed", "Driver assigned", "Goods collected", "In transit", "Delivered"] as const;

export const FAQS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "What is the minimum shipment weight?",
    answer: "Each shipment must weigh at least 50 kg. Loads below that are not quoted under our standard booking.",
  },
  {
    question: "Can I share a truck with other shipments?",
    answer: "Yes. Choose a shared booking to pay only for the capacity you use, or book a dedicated truck for your load alone. Shared bookings never exceed a truck's verified capacity.",
  },
  {
    question: "How is my price calculated?",
    answer: "Your weight in tonnes is multiplied by the vendor's rate per tonne for your route. Any loading, offloading or toll charges are then added as separate lines. You see the final amount in naira before you pay.",
  },
  {
    question: "How are vendors and trucks verified?",
    answer: "Every vendor completes identity and business checks, and every truck is reviewed separately against its registration, ownership, roadworthiness and insurance documents. Trucks with expired documents cannot take new bookings.",
  },
  {
    question: "How do I follow my shipment?",
    answer: "Each booking moves through clear statuses, from confirmed and driver assigned to goods collected, in transit and delivered. You are notified at each step.",
  },
  {
    question: "What if something goes wrong?",
    answer: "You can open a dispute on any booking for late delivery, damage, missing goods or unexpected charges. Our team reviews the pickup and delivery records and documents the resolution.",
  },
];
