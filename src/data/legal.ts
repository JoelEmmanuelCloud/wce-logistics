export type LegalSection = { id: string; heading: string; paragraphs?: string[]; list?: string[]; after?: string[] };

export type LegalDocument = { title: string; summary: string; updated: string; sections: LegalSection[] };

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy policy",
  summary:
    "What personal information WCE Logistics collects when you use our website and booking platform, why we collect it, who we share it with and the choices you have.",
  updated: "30 October 2026",
  sections: [
    {
      id: "who-we-are",
      heading: "Who we are",
      paragraphs: [
        "WCE Logistics runs an online platform that connects businesses and people who need to move goods between Nigerian states (shippers) with truck owners, fleet operators and logistics companies (vendors).",
        "WCE Logistics decides how and why the personal information described here is used, and is responsible for it under the Nigeria Data Protection Act 2023.",
      ],
    },
    {
      id: "what-we-collect",
      heading: "What we collect",
      paragraphs: ["We only collect what we need to run bookings safely. Depending on how you use the platform, this includes:"],
      list: [
        "Account details: your email address, full name, phone number and whether you ship goods or run trucks.",
        "Sign-in details: the one-time codes we email you, which we store only in scrambled form and which expire after 10 minutes, and the IP address and browser details of sign-in attempts.",
        "Shipment details: pickup and delivery addresses, cargo type and description, weight, number of packages, declared value and handling notes.",
        "Vendor details: legal and business name, business address, the states you operate in, CAC registration number, identity document number and the documents you upload, such as vehicle registration, proof of ownership, roadworthiness certificates and insurance.",
        "Truck details: registration number, make, model, payload, base location and photos.",
        "Driver details that vendors add: name, phone number, licence number and licence class.",
        "Payment records: payment references, amounts and status. Card and bank details you enter at checkout go directly to our payment provider, Paystack. We never see or store them.",
        "Payout details for vendors: bank name, account name and account number.",
        "Delivery records: pickup and delivery times, the name of the person who received the goods and proof of delivery photos.",
        "Reviews, problem reports, dispute messages and the evidence you attach to them.",
        "Copies of the service emails we send you, such as booking updates.",
        "Technical details: your IP address and browser details when you sign in and when you take actions we keep a record of, such as confirming a booking.",
      ],
    },
    {
      id: "how-we-use-it",
      heading: "How we use it and why we are allowed to",
      list: [
        "To run the service you signed up for: creating your account, matching loads to trucks, taking bookings and payments, paying vendors and tracking deliveries. We rely on our contract with you.",
        "To verify vendors, trucks and drivers before they can take bookings. We rely on our contract with you and our legitimate interest in keeping the marketplace safe.",
        "To keep accounts secure and to prevent fraud and misuse. We rely on our legitimate interests.",
        "To look into problems and resolve disputes using the booking, pickup and delivery records. We rely on our legitimate interests.",
        "To meet our legal, tax and accounting duties. We rely on legal obligation.",
        "To send you service messages about your account and bookings. We rely on our contract with you. We do not send marketing messages unless you have agreed to receive them.",
      ],
    },
    {
      id: "who-we-share-it-with",
      heading: "Who we share it with",
      paragraphs: ["We do not sell personal information. We share it only where needed to run the service:"],
      list: [
        "The other side of your booking. Shippers see the vendor's business name and the truck and driver details needed for pickup. Vendors and their drivers see the pickup and delivery addresses, contact details and cargo details of the booking.",
        "Paystack, which processes payments, refunds and vendor payouts.",
        "Resend, which delivers our emails.",
        "The providers that host our platform and store files such as documents and photos.",
        "Government bodies, regulators, courts or the police, when the law requires it or to protect people from harm.",
      ],
      after: ["Each provider may only use your information to provide its service to us."],
    },
    {
      id: "transfers",
      heading: "Information processed outside Nigeria",
      paragraphs: [
        "Some of our providers process information outside Nigeria. When this happens we rely on the safeguards allowed under the Nigeria Data Protection Act 2023, such as contracts that require the provider to protect your information to the same standard.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies",
      paragraphs: [
        "We use one cookie, which keeps you signed in. It lasts up to 30 days and is renewed while you keep using the platform. Signing out removes it.",
        "We do not use advertising or tracking cookies.",
      ],
    },
    {
      id: "security",
      heading: "How we protect it",
      list: [
        "Identity numbers, driver licence numbers and bank account numbers are encrypted when stored.",
        "Sign-in codes and session tokens are stored only in scrambled form.",
        "Uploaded documents are private and can only be opened by the people who need them.",
        "Only staff who need access for their work can see personal information, and important actions are recorded.",
      ],
      after: ["No system is completely secure. If a breach affects your information, we will tell you and the regulator as the law requires."],
    },
    {
      id: "retention",
      heading: "How long we keep it",
      paragraphs: [
        "We keep your account information while your account is open. We keep booking, payment, payout and dispute records for as long as we need them to meet tax, accounting and legal duties and to deal with claims.",
        "When you ask us to close your account, we delete or anonymise the information we no longer need to keep.",
      ],
    },
    {
      id: "your-rights",
      heading: "Your rights",
      paragraphs: ["Under the Nigeria Data Protection Act 2023 you can ask us to:"],
      list: [
        "Give you a copy of the personal information we hold about you.",
        "Correct information that is wrong or incomplete.",
        "Delete your information, where we no longer have a reason to keep it.",
        "Stop or limit how we use your information.",
        "Send your information to you or to another organisation in a common format.",
        "Withdraw any consent you have given.",
      ],
      after: [
        "To make a request, email us from the address on your account. We will reply within the time the law allows. If you are not happy with our answer, you can complain to the Nigeria Data Protection Commission.",
      ],
    },
    {
      id: "children",
      heading: "Children",
      paragraphs: ["The platform is for people aged 18 and over. We do not knowingly collect information from children."],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      paragraphs: [
        "We will update this policy when the way we handle information changes. The date at the top shows when it last changed. If a change is significant, we will tell you by email before it takes effect.",
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of service",
  summary: "The rules for booking trucks and listing trucks on WCE Logistics, including payments, cancellations, refunds and disputes.",
  updated: "30 October 2026",
  sections: [
    {
      id: "about",
      heading: "About these terms",
      paragraphs: [
        "These terms apply when you use the WCE Logistics website and booking platform. By creating an account or making a booking, you agree to them. If you do not agree, do not use the platform.",
        "Our privacy policy explains how we handle your personal information and forms part of these terms.",
      ],
    },
    {
      id: "what-we-do",
      heading: "What WCE Logistics does",
      paragraphs: [
        "WCE Logistics is a marketplace. Shippers describe the goods they need to move, and vendors offer space on trucks they own or operate. We verify vendors and trucks, take payment for bookings, pass payment to vendors and keep a record of each booking from pickup to delivery.",
        "The vendor who accepts a booking is the carrier and is responsible for collecting, transporting and delivering the goods.",
      ],
    },
    {
      id: "accounts",
      heading: "Your account",
      list: [
        "You must be 18 or over and able to enter into a binding agreement.",
        "You sign in with a one-time code sent to your email. Keep access to your email secure, because anyone who can read it can sign in as you.",
        "The information you give us must be true and kept up to date.",
        "If you use the platform for a business, you confirm that you are allowed to act for it.",
        "You are responsible for what happens under your account. Tell us straight away if you think someone else has used it.",
      ],
    },
    {
      id: "shippers",
      heading: "Booking a truck",
      list: [
        "Describe your load accurately, including its weight, cargo type, number of packages and value. Trucks are matched to your load on that basis.",
        "Each shipment must meet the minimum weight shown when you book, currently 50 kg.",
        "Your price is your chargeable weight multiplied by the vendor's rate per kilogram for the route, plus any additional charges, which are listed line by line. You see the final amount in naira before you pay. A dedicated truck is charged at the fixed price shown for that trip.",
        "When you request a booking, the vendor has a set time to accept it, currently 24 hours. If they do not respond in time, the request expires and no payment is taken.",
        "A booking is confirmed once the vendor accepts it and your payment succeeds. The price you agreed is then held, even if the vendor later changes their rates.",
        "Have your goods packed, labelled and ready at the pickup address on the agreed date, and make sure someone is available to receive them at delivery.",
      ],
    },
    {
      id: "prohibited-goods",
      heading: "Goods you may not send",
      paragraphs: ["You may not book transport for:"],
      list: [
        "Anything illegal to own or move in Nigeria, or goods without the permits the law requires.",
        "Weapons, ammunition or explosives.",
        "Dangerous or hazardous goods, unless you have declared them and the vendor has agreed in writing to carry them.",
        "Live animals or people, except passengers on a bus charter booked for that purpose.",
        "Cash, jewellery or other high-value items that you have not declared.",
      ],
      after: ["A vendor may refuse to load goods that break these rules. You are responsible for any loss or harm they cause."],
    },
    {
      id: "vendors",
      heading: "Listing trucks",
      list: [
        "Before you can take bookings, our team must approve your identity and business documents, and each truck must be approved on its own documents.",
        "Keep vehicle registration, proof of ownership or operating authority, roadworthiness and insurance documents valid. Trucks with expired documents are taken off the market until they are renewed.",
        "Publish only routes, dates, capacity and rates you can honour. Do not accept loads beyond a truck's approved payload.",
        "Once you accept a booking, carry it out as agreed. Assign a driver who holds a valid licence for the vehicle, and record pickup and delivery on the platform.",
        "Take reasonable care of the goods while they are in your possession, and keep insurance that covers the goods you carry.",
        "We deduct our platform commission from each booking. Your share is paid to your verified bank account through Paystack after the booking is completed.",
      ],
    },
    {
      id: "payments",
      heading: "Payments",
      list: [
        "All prices are in Nigerian naira. Payments are processed by Paystack, and Paystack's own terms apply to the payment.",
        "Do not pay a vendor or driver outside the platform for a booking made on it. Payments made outside the platform are not covered by our refund and dispute process.",
      ],
    },
    {
      id: "cancellations",
      heading: "Cancellations and refunds",
      list: [
        "You can cancel a booking from your account until the goods are collected.",
        "A vendor can cancel a confirmed booking before the goods are collected, and must give a reason.",
        "If a paid booking is cancelled, our team reviews it and refunds the payment through Paystack to the method you paid with. Your bank or card issuer may take a few days to show the refund.",
        "Once goods are collected, a booking can only be cancelled by contacting us.",
      ],
    },
    {
      id: "delivery",
      heading: "Delivery and completion",
      paragraphs: [
        "The vendor records delivery on the platform, with the time, the name of the person who received the goods and a photo where possible. If you do not report a problem within the set time after delivery, currently 72 hours, the booking is marked as completed.",
      ],
    },
    {
      id: "disputes",
      heading: "Problems and disputes",
      list: [
        "You can report a problem on a paid booking, such as late delivery, damage, missing goods or unexpected charges, up to the number of days shown on your booking after it is completed or cancelled, currently 14 days.",
        "Our team reviews the booking, pickup and delivery records and any evidence both sides provide, and records the outcome. The outcome may include a full or partial refund.",
        "We aim to resolve disputes fairly, but our decision does not stop you from taking any other action the law allows.",
      ],
    },
    {
      id: "reviews",
      heading: "Reviews",
      paragraphs: [
        "After a booking, you can rate the other side. Reviews must be honest and based on your own experience. We may remove reviews that are abusive, misleading or unrelated to the booking.",
      ],
    },
    {
      id: "conduct",
      heading: "Using the platform properly",
      paragraphs: ["You must not:"],
      list: [
        "Give false information or upload documents that are not genuine.",
        "Use another person's account or let someone else use yours.",
        "Try to get around our fees by arranging bookings off the platform with people you met on it.",
        "Harass, threaten or abuse other users or our staff.",
        "Interfere with the platform, try to access data you are not allowed to see, or collect other users' information.",
      ],
    },
    {
      id: "suspension",
      heading: "Suspending or closing accounts",
      paragraphs: [
        "We may suspend or close an account, or remove a truck or route, if these terms are broken, if documents expire or turn out to be false, or if we need to protect other users. Where we can, we will tell you why. Bookings already confirmed will be dealt with fairly, including refunds where they are due.",
        "You can close your account at any time by contacting us, once you have no open bookings.",
      ],
    },
    {
      id: "liability",
      heading: "Our responsibility",
      list: [
        "We check vendors and trucks before they can take bookings, but we do not carry goods ourselves. The vendor is responsible for loss of or damage to goods in their care.",
        "We are not responsible for delays or losses caused by events outside reasonable control, such as road closures, severe weather, strikes or civil unrest.",
        "As far as the law allows, our total responsibility to you for any booking is limited to the amount you paid for that booking.",
        "Nothing in these terms limits any right you have under Nigerian law that cannot be limited, including your rights under the Federal Competition and Consumer Protection Act 2018.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to these terms",
      paragraphs: [
        "We may update these terms as the platform changes. The date at the top shows when they last changed. If a change is significant, we will tell you by email before it takes effect. Bookings confirmed before a change stay under the terms that applied when they were made.",
      ],
    },
    {
      id: "law",
      heading: "Governing law",
      paragraphs: [
        "These terms are governed by the laws of the Federal Republic of Nigeria. If a disagreement cannot be resolved with us directly, it will be handled by the courts of Nigeria.",
      ],
    },
  ],
};
