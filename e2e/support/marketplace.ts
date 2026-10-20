import { randomInt } from "node:crypto";
import type postgres from "postgres";
import { NIGERIAN_STATES } from "../../src/data/nigeria-states";
import type { TestUser } from "./fixtures";

export function corridor(): [string, string] {
  const from = NIGERIAN_STATES[Math.floor(Math.random() * NIGERIAN_STATES.length)];
  const others = NIGERIAN_STATES.filter((state) => state !== from);
  return [from, others[Math.floor(Math.random() * others.length)]];
}

export function lagosDate(offsetDays: number): string {
  return new Date(Date.now() + 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function plate(): string {
  const letters = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `LND-${Math.floor(100 + Math.random() * 900)}${letters()}${letters()}`;
}

function bookingReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let index = 0; index < 8; index += 1) {
    value += alphabet[randomInt(0, alphabet.length)];
  }
  return `WCE-${value}`;
}

export async function verifiedVendorWithTruck(sql: postgres.Sql, user: TestUser) {
  const [vendor] = await sql<{ id: string }[]>`
    insert into vendor_profiles (user_id, category, legal_name, business_name, email, address_line, city, state, operating_states, id_document_type, id_document_reference_last4, verification_status, submitted_at, reviewed_at)
    values (${user.id}, 'logistics_company', ${user.fullName}, ${`${user.fullName} Haulage`}, ${`ops${Date.now()}${Math.random()}@example.com`}, '1 Wharf Road', 'Apapa', 'Lagos', ${["Lagos", "Kano"]}, 'nin', '1234', 'verified', now(), now())
    returning id`;
  const registration = plate();
  const [truck] = await sql<{ id: string }[]>`
    insert into trucks (vendor_id, registration_number, registration_normalized, make, model, year, category, tyre_count, max_payload_kg, body_type, cargo_types, base_state, base_city, listing_status, submitted_at, reviewed_at)
    values (${vendor.id}, ${registration}, ${registration.replace(/[^A-Z0-9]/g, "")}, 'DAF', 'XF 480', 2021, 'heavy_duty', 10, 20000, 'enclosed', ${["general_goods", "machinery"]}, 'Lagos', 'Apapa', 'active', now(), now())
    returning id`;
  return { vendorId: vendor.id, truckId: truck.id, registration };
}

export async function createShipment(sql: postgres.Sql, customerId: string, weightKg: number, pickupDate: string, from: string, to: string) {
  const [shipment] = await sql<{ id: string }[]>`
    insert into shipments (customer_id, origin_state, origin_city, origin_address, destination_state, destination_city, destination_address, cargo_type, description, weight_kg, package_count, pickup_date, booking_type)
    values (${customerId}, ${from}, ${`${from} Central`}, '12 Market Road', ${to}, ${`${to} Central`}, '3 Station Road', 'general_goods', 'Cartons of tiles', ${weightKg}, 20, ${pickupDate}, 'shared')
    returning id`;
  return shipment.id;
}

export async function acceptedBooking(sql: postgres.Sql, vendorUser: TestUser, customer: TestUser, weightKg: number, ratePerKgKobo: number) {
  const [from, to] = corridor();
  const { vendorId, truckId } = await verifiedVendorWithTruck(sql, vendorUser);
  const [route] = await sql<{ id: string }[]>`
    insert into routes (truck_id, vendor_id, origin_state, origin_city, destination_state, destination_city, departure_date, transit_hours, capacity_kg, reserved_kg, rate_per_kg_kobo, minimum_charge_kobo)
    values (${truckId}, ${vendorId}, ${from}, 'Depot', ${to}, 'Depot', ${lagosDate(6)}, 30, 5000, ${weightKg}, ${ratePerKgKobo}, 0)
    returning id`;
  const shipmentId = await createShipment(sql, customer.id, weightKg, lagosDate(5), from, to);
  const totalKobo = weightKg * ratePerKgKobo;
  const reference = bookingReference();
  const [booking] = await sql<{ id: string }[]>`
    insert into bookings (reference, shipment_id, route_id, truck_id, vendor_id, customer_id, type, status, reserved_kg, chargeable_weight_kg, rate_per_kg_kobo, line_items, total_kobo, response_due_at, responded_at)
    values (${reference}, ${shipmentId}, ${route.id}, ${truckId}, ${vendorId}, ${customer.id}, 'shared', 'awaiting_payment', ${weightKg}, ${weightKg}, ${ratePerKgKobo}, ${sql.json([{ label: `Transport: ${weightKg} kg`, amountKobo: totalKobo }])}, ${totalKobo}, now() + interval '1 day', now())
    returning id`;
  await sql`update shipments set status = 'booked' where id = ${shipmentId}`;
  return { bookingId: booking.id, reference, totalKobo, vendorId };
}
