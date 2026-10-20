# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## WCE Logistics: Nigerian Interstate Logistics and Truck Booking Platform

**Document Version:** 1.0
**Document Status:** Draft for Development Planning
**Product Type:** Web and Mobile Logistics Marketplace
**Primary Market:** Nigeria
**Document Owner:** Product Management
**Target Users:** Shippers, Truck Vendors, Fleet Operators, and Platform Administrators

---

# 1. EXECUTIVE SUMMARY

## 1.1 Product Overview

The proposed platform is a digital logistics marketplace that connects individuals and businesses seeking to transport goods between Nigerian states with vendors offering available trucks and freight transportation services.

The platform will enable customers to discover available trucks, compare transport prices, submit shipment details, book transportation services, make payments, and monitor delivery progress.

Truck vendors will be able to register their businesses or individual accounts, register and manage trucks, submit vehicle documentation, specify routes and availability, configure pricing, receive booking requests, and manage transportation assignments.

The platform will establish a minimum shipment threshold of 50 kilograms (kg), with pricing calculated according to the approved pricing model.

The system must support multiple vendors, multiple trucks per vendor, and the potential for multiple customer shipments to share a truck where the relevant operational conditions permit.

## 1.2 Product Vision

To build a reliable, transparent, and accessible logistics marketplace that simplifies interstate goods transportation across Nigeria by connecting available truck capacity with customer shipping demand.

## 1.3 Business Objectives

1. Digitize the discovery and booking of interstate truck transportation services.
2. Reduce the time customers spend searching for reliable truck vendors.
3. Improve the utilization of available truck capacity.
4. Establish transparent and consistent shipment pricing.
5. Improve accountability through vendor verification and delivery confirmation.
6. Create a scalable network of independent truck owners and logistics companies.
7. Generate revenue through platform commissions or other approved transaction fees.

## 1.4 Product Scope

The initial release will focus on vendor onboarding, truck registration, verification, truck availability, shipment booking, pricing, payment records, and delivery status management.

Advanced route optimization, automated load consolidation, and live GPS tracking may be introduced in subsequent releases.

---

# 2. PROBLEM STATEMENT

Customers transporting goods between Nigerian states often rely on informal contacts, personal referrals, phone calls, and manual negotiations to locate suitable trucks. This creates several challenges:

- Limited visibility into available trucks.
- Difficulty comparing vendor prices.
- Uncertainty about vehicle capacity and suitability.
- Inconsistent vendor verification.
- Poor visibility into booking status and delivery progress.
- Limited accountability when disputes arise.
- Inefficient utilization of available truck capacity.

Truck owners and logistics companies also experience challenges finding customers for available vehicles, particularly when trucks are returning from a delivery or have unused capacity.

The platform will address these challenges by establishing a centralized marketplace for truck discovery, booking, and shipment management.

---

# 3. USER ROLES AND PERMISSIONS

## 3.1 Customer / Shipper

An individual or business seeking to transport goods.

- Create and manage an account.
- Submit shipment details.
- Search available transportation services.
- Compare vendor offers.
- Request or confirm bookings.
- Make payments through supported payment channels.
- View booking status.
- Access pickup and delivery information.
- Confirm receipt of goods.
- Submit reviews.
- Raise disputes or report delivery incidents.

## 3.2 Truck Vendor

An individual truck owner, authorized truck operator, fleet manager, or logistics company providing transportation services.

- Create and manage a vendor account.
- Complete identity and business verification.
- Register and manage trucks.
- Upload vehicle documents.
- Configure routes and service areas.
- Specify vehicle availability.
- Set or propose transport prices, subject to the final pricing model.
- Receive and respond to booking requests.
- Assign drivers to approved bookings.
- Update transportation status.
- Upload pickup and delivery evidence.
- View transaction records.
- View ratings and performance metrics.

## 3.3 Driver

An individual assigned to transport a shipment using an approved truck.

- Access assigned deliveries.
- View relevant shipment instructions.
- View pickup and destination details.
- Update permitted delivery statuses.
- Submit pickup and delivery evidence.
- Report delays, breakdowns, or incidents.

Drivers must not automatically inherit access to the vendor's financial records or unrelated customer shipments.

## 3.4 Platform Administrator

Manages the platform and oversees verification, operational compliance, and dispute handling.

- View and manage users.
- Review vendor verification submissions.
- Approve, reject, suspend, or reactivate vendor accounts.
- Review truck documentation.
- Approve or reject truck listings.
- Manage shipment and booking records.
- Monitor payments and payouts.
- Manage complaints and disputes.
- Configure platform fees and operational policies.
- View system reports and audit logs.

Administrative permissions must be role-based. Sensitive actions must be recorded in an audit log.

---

# 4. VENDOR REGISTRATION AND ONBOARDING

## 4.1 Objective

Enable legitimate truck owners, authorized operators, and logistics companies to register and begin offering transportation services.

## 4.2 Registration Workflow

1. Account creation.
2. Contact verification.
3. Vendor profile completion.
4. Identity and business verification.
5. Truck registration.
6. Vehicle documentation submission.
7. Route and availability configuration.
8. Pricing configuration.
9. Payout account registration.
10. Administrative review and activation.

The platform may permit vendors to save incomplete registrations and continue later.

## 4.3 Vendor Registration Fields

| Field | Data Type | Requirement |
|---|---|---|
| Vendor ID | System-generated identifier | Mandatory |
| Vendor category | Individual or registered business | Mandatory |
| Full legal name | Text | Mandatory |
| Business name | Text | Conditional |
| Phone number | Nigerian or supported international phone format | Mandatory |
| Phone verification status | Boolean/status | Mandatory |
| Email address | Email | Mandatory |
| Business address | Address fields | Mandatory |
| Operating states | Multi-select | Mandatory |
| Identity document type | Enum | Mandatory |
| Identity document reference | Protected string or verification reference | Mandatory |
| CAC registration number | Text | Conditional |
| Verification status | Enum | Mandatory |
| Account status | Enum | Mandatory |
| Created timestamp | Datetime | System-generated |

Vendor categories: individual truck owner, registered logistics company, fleet manager or authorized operator.

The business rules must determine whether transport brokers or agents can list trucks and, if permitted, what evidence of authorization they must provide.

## 4.4 Verification Statuses

Draft, Submitted, Under Review, Additional Information Required, Verified, Rejected, Suspended.

A vendor account must not be considered verified merely because documents have been uploaded.

## 4.5 Acceptance Criteria

- A vendor can register using a valid phone number.
- The system verifies the phone number through OTP or an equivalent supported method.
- Required fields are validated before submission.
- Duplicate accounts are flagged using appropriate identifiers and fraud controls.
- Vendors can view their verification status.
- Administrators can approve or reject submissions with a recorded reason.
- Only vendors meeting the configured activation requirements can publish trucks for booking.
- Vendors can manage multiple trucks under a single account.

---

# 5. TRUCK REGISTRATION AND MANAGEMENT

## 5.1 Objective

Enable vendors to create, maintain, and manage individual truck listings. Every truck must have a unique system-generated identifier and an associated vendor account.

## 5.2 Truck Registration Fields

| Field | Data Type | Requirement |
|---|---|---|
| Truck ID | System-generated identifier | Mandatory |
| Vendor ID | Foreign key | Mandatory |
| Vehicle registration number | Text | Mandatory |
| Truck make | Text or controlled list | Mandatory |
| Truck model | Text | Mandatory where applicable |
| Vehicle year | Integer | Optional initially |
| Truck category | Enum | Mandatory |
| Tyre configuration | Enum or integer | Mandatory |
| Maximum permitted payload | Decimal, kg | Mandatory |
| Available cargo capacity | Decimal, kg | Mandatory for capacity-based bookings |
| Cargo body length | Decimal, metres | Required where dimensional matching applies |
| Cargo body width | Decimal, metres | Required where dimensional matching applies |
| Cargo body height | Decimal, metres | Required where dimensional matching applies |
| Cargo body type | Enum | Mandatory |
| Supported cargo types | Multi-select | Mandatory |
| Current location | Structured location | Mandatory |
| Supported routes | Route records | Mandatory before activation |
| Truck photographs | File references | Mandatory |
| Documentation status | Enum | Mandatory |
| Availability status | Enum | Mandatory |
| Listing status | Enum | Mandatory |

Initial truck categories (admin-maintained): light-duty, medium-duty, heavy-duty, flatbed, enclosed box, articulated, tipper, refrigerated, other approved types.

Tyre configuration must not be used as a substitute for verified payload capacity.

## 5.3 Vehicle Documentation

Supported documents: vehicle registration, evidence of ownership/lease/operating authorization, vehicle licence, roadworthiness, insurance, other permits or certificates.

Each document record: Document ID, Truck ID or Vendor ID, document type, file reference, issue date, expiry date, verification status, reviewer ID, rejection reason.

Sensitive documents must be stored securely and made accessible only to authorized users.

## 5.4 Truck Listing Statuses

Draft, Pending Verification, Active, Unavailable, Suspended, Expired Documentation, Archived.

## 5.5 Truck Management Rules

1. A truck cannot be listed for booking until it satisfies the configured verification requirements.
2. A truck must have a valid payload capacity before accepting capacity-constrained bookings.
3. A vendor must not be able to exceed the truck's available capacity.
4. Expired mandatory documentation must trigger the applicable restriction.
5. A truck with an active assignment must not be double-booked for conflicting dates or capacity.
6. Changes to critical truck information must be recorded.
7. A vendor may register multiple trucks.
8. A truck must belong to one accountable managing vendor at a time, with authorized ownership or operating relationships recorded separately.

## 5.6 Acceptance Criteria

- Vendors can create, edit, and archive truck listings.
- Required fields are validated.
- Vehicle registration numbers are checked for duplicate listings.
- Truck photographs and documents can be uploaded.
- Administrators can review and approve truck listings.
- The system blocks bookings that exceed verified capacity.
- Vendors can view the status of each truck.
- The system identifies trucks whose required documentation has expired.

---

# 6. ROUTE AND AVAILABILITY MANAGEMENT

## 6.1 Route Data Structure

| Field | Description |
|---|---|
| Route ID | Unique identifier |
| Truck ID | Associated truck |
| Origin state | Departure state |
| Origin town or city | Pickup area |
| Origin service area | Optional geographic boundary |
| Destination state | Arrival state |
| Destination town or city | Delivery area |
| Route type | One-way, return, or recurring |
| Departure date | Planned departure |
| Estimated transit duration | Expected travel duration |
| Availability capacity | Capacity available for booking |
| Route status | Active, paused, completed, or cancelled |

The database must distinguish between a state-level route and a specific pickup or delivery location.

## 6.2 Availability Management

Vendors must be able to set departure dates, define available capacity, pause or remove future availability, review active bookings, prevent conflicting assignments, update estimated departure information, and specify whether a route can accommodate shared shipments.

## 6.3 Acceptance Criteria

- Customers can search by origin, destination, and intended pickup date.
- Search results include only eligible trucks and services.
- The system excludes unavailable trucks from bookable results.
- Availability updates are reflected in subsequent searches.
- Concurrent booking requests cannot over-allocate truck capacity.
- A vendor cannot remove an active booking without following the cancellation workflow.

---

# 7. SHIPMENT CREATION AND BOOKING

## 7.1 Shipment Fields

| Field | Data Type | Requirement |
|---|---|---|
| Shipment ID | System-generated | Mandatory |
| Customer ID | Foreign key | Mandatory |
| Origin state | State reference | Mandatory |
| Origin town or location | Address/location | Mandatory |
| Destination state | State reference | Mandatory |
| Destination town or location | Address/location | Mandatory |
| Cargo category | Enum | Mandatory |
| Cargo description | Text | Mandatory |
| Shipment weight | Decimal, kg | Mandatory |
| Package count | Integer | Mandatory |
| Dimensions | Structured measurement | Conditional |
| Handling requirements | Text or controlled values | Conditional |
| Declared cargo value | Currency amount | Recommended |
| Pickup date | Date/time | Mandatory |
| Delivery deadline | Date/time | Optional |
| Loading requirements | Text or controlled values | Conditional |
| Unloading requirements | Text or controlled values | Conditional |
| Special instructions | Text | Optional |
| Booking type | Shared or dedicated | Mandatory |
| Shipment status | Enum | Mandatory |

## 7.2 Minimum Shipment Threshold

Minimum eligible shipment weight: **50 kg per individual shipment.**

1. Accept weights greater than or equal to 50 kg.
2. Reject weights below 50 kg unless an administrator-approved exception exists.
3. Validate that the weight is a positive numeric value.
4. Display the minimum weight requirement before booking confirmation.
5. Use the approved chargeable-weight calculation for pricing.
6. Prevent shipments from exceeding the capacity allocated to the booking.

## 7.3 Booking Workflow

1. Customer enters shipment details.
2. System validates the shipment.
3. System searches for matching trucks or vendor services.
4. Customer reviews available offers.
5. Customer selects an offer.
6. System displays the full price and applicable terms.
7. Customer submits the booking request.
8. Vendor accepts or rejects the request, unless instant booking is enabled.
9. System confirms availability and reserves the relevant capacity.
10. Customer completes the required payment.
11. The booking becomes confirmed according to the configured payment and acceptance rules.
12. Vendor assigns a driver.
13. Pickup and delivery activities are recorded.
14. Delivery is confirmed.
15. The transaction is finalized and becomes eligible for settlement according to the payout policy.

## 7.4 Booking Statuses

Draft, Pending Vendor Acceptance, Accepted, Awaiting Payment, Confirmed, Pickup Scheduled, Goods Collected, In Transit, Delivery Attempted, Delivered, Completed, Rejected, Cancelled, Disputed.

## 7.5 Acceptance Criteria

- Customers can submit valid shipments.
- Shipments below the configured minimum are rejected.
- Search results reflect route, date, cargo compatibility, and available capacity.
- Customers can review the total price before committing.
- A booking cannot be confirmed if the required capacity is no longer available.
- Vendors can accept or reject eligible booking requests.
- Every booking has a unique reference.
- Booking status changes are timestamped and attributable to the responsible user or system process.

---

# 8. PRICING ENGINE

**Base Transport Price = Chargeable Weight x Approved Rate per Kilogram**

**Total Customer Price = Base Transport Price + Applicable Additional Charges - Approved Discounts**

Chargeable weight equals actual weight in the initial release unless dimensional pricing is enabled.

Price record: Price ID, Vendor ID, Truck ID or category, origin and destination, cargo category, rate per kg, minimum charge, additional charge rules, effective start/end dates, currency, approval status.

Rules:

1. Prices displayed in NGN.
2. Shipments below 50 kg receive no standard quote.
3. Defined decimal precision and rounding rule.
4. Final payable amount shown before payment.
5. Additional charges itemized.
6. Quoted price preserved per quote-validity policy.
7. Future vendor price changes never alter confirmed bookings.
8. Post-confirmation adjustments require an authorized change process.

Example: 500 kg x 20 NGN/kg = 10,000 NGN; plus 2,000 NGN charges = 12,000 NGN total.

---

# 9. PAYMENTS, COMMISSIONS, AND PAYOUTS

Supports payment initiation, provider integration, status verification, transaction references, platform fee calculation, vendor payout records, refunds, dispute restrictions, reconciliation reports, and transaction history.

Payment record: Payment ID, Booking ID, Customer ID, Vendor ID, amount, currency, provider, provider reference, status, platform fee, vendor payable, refund amount, created and confirmed timestamps.

Payment statuses: Pending, Processing, Successful, Failed, Partially Refunded, Refunded, Disputed. Payouts have a separate lifecycle.

Financial controls:

1. Payment status verified through the provider's trusted confirmation mechanism.
2. A success redirect is never sufficient proof of payment.
3. Webhooks authenticated and handled idempotently.
4. Duplicate notifications never create duplicate transactions.
5. Payouts follow the approved settlement policy.
6. Refunds and payout adjustments recorded.
7. Financial records auditable.
8. Sensitive payment credentials not stored directly.

The platform must not advertise escrow unless legally supported.

---

# 10. DRIVER ASSIGNMENT AND DELIVERY MANAGEMENT

Driver record: Driver ID, full name, phone, identity verification, licence information, licence category, licence expiry, operating relationship, account status.

Assignment checks: driver active, verification complete, licence appropriate for vehicle, truck approved and available, no conflicting commitments.

Delivery statuses: Driver Assigned, Pickup Scheduled, Arrived at Pickup, Goods Collected, In Transit, Arrived at Destination, Delivery Attempted, Delivered, Incident Reported.

Proof of pickup/delivery: timestamp, booking reference, actor identity, recipient confirmation, optional photo or document, notes, exception reason.

Initial release uses status-based tracking. Live GPS is a later phase and requires consent, access restrictions, and retention rules.

---

# 11. NOTIFICATIONS

Channels: in-app, SMS, email, WhatsApp (subject to integration and consent).

Events: account verified, documentation rejected, truck approved, booking request received, booking accepted/rejected, payment confirmed/failed, driver assigned, goods collected, in transit, delivered, cancelled, dispute opened/updated, payout processed.

---

# 12. RATINGS, REVIEWS, AND DISPUTES

Review: Review ID, Booking ID, Customer ID, Vendor ID, rating, optional feedback, timestamp, moderation status. One review per eligible transaction.

Dispute categories: non-delivery, late delivery, damaged goods, missing goods, unexpected charges, incorrect details, cancellations, payment or refund problems.

Dispute: Dispute ID, Booking ID, reporter, category, description, evidence, assigned admin, status, resolution notes, resolution timestamp. States: Open, Under Review, Awaiting Information, Resolved, Closed.

---

# 13. ADMINISTRATIVE DASHBOARD

Modules: vendor management, truck management, booking management, financial management, dispute management, configuration (cargo categories, truck categories, minimum weight, platform fees, notification templates, policies), reporting (active vendors, verified trucks, capacity, bookings, completed deliveries, cancellation rate, GBV, revenue, payout liabilities, dispute rate).

Configuration changes restricted to authorized roles and logged.

---

# 14. NON-FUNCTIONAL REQUIREMENTS

- **Security:** authentication, RBAC, TLS, encryption at rest for sensitive data, secure uploads, server-side validation, rate limiting, OWASP protections, audit logs, account recovery and credential revocation.
- **Privacy:** Nigerian data protection compliance (NDPA), privacy notices, retention periods, restricted access to identity and financial records.
- **Performance:** API p95 under 500 ms, search p95 under 2 s, no duplicate capacity allocation.
- **Availability:** 99.5% monthly; booking and payment operations fail safely.
- **Scalability:** multiple states, vendors, trucks, concurrent bookings, additional providers, future mobile apps and GPS.
- **Usability:** mobile-first, works on common Android and iOS browsers, low-bandwidth friendly, consistent price formatting.

---

# 15. DATA MODEL

Users, Vendor Profiles, Vendor Documents, Trucks, Truck Documents, Drivers, Driver Assignments, Routes, Availability, Shipments, Bookings, Booking Items, Pricing Rules, Payments, Payouts, Delivery Events, Delivery Evidence, Notifications, Reviews, Disputes, Audit Logs.

---

# 16. DEVELOPMENT PHASES

1. **Foundation:** authentication, roles and permissions, vendor registration and verification, truck registration, document management.
2. **Marketplace:** routes, availability, shipment creation, search, pricing engine, booking workflow.
3. **Transactions:** payment integration, commission, payouts, cancellations, notifications.
4. **Delivery Operations:** drivers, assignment, status updates, evidence, reviews, disputes.
5. **Optimization:** GPS, route optimization, automated matching, shared-load optimization, analytics.

---

# 17. OPEN PRODUCT DECISIONS

| Decision | Recommended Starting Position |
|---|---|
| Eligible vendor categories | Individual owners, logistics companies, authorized fleet managers |
| Minimum shipment weight | 50 kg per individual shipment |
| Booking models | Shared and dedicated truck bookings |
| Initial pricing | Configurable per-kg pricing with route-specific rules |
| Pricing authority | Vendor-defined or hybrid |
| Vendor verification | Administrative review before activation |
| Truck verification | Separate review for each truck |
| Payment timing | Confirmed through an approved payment workflow |
| Vendor settlement | Defined payout policy with dispute handling |
| Delivery tracking | Status-based in the initial release |
| GPS tracking | Subsequent phase |
| Mobile experience | Responsive web application initially |
| Restricted cargo | Explicit cargo acceptance and prohibited-goods policy |
| Shared-load allocation | Prevent overbooking, preserve shipment-level accountability |
