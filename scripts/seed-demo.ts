import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { IMAGES, type SiteImage } from "../src/data/images";
import { connectionSettings, databaseUrl } from "../src/server/db/connection";

config({ path: ".env.local" });

type DemoProduct = { title: string; description: string; category: string; unitLabel: string; unitWeightKg: number; naira: number; stock: number; minimum: number; image: SiteImage };

type DemoSeller = { slug: string; name: string; city: string; state: string; address: string; plate: string; truck: [string, string]; payloadKg: number; rates: Array<[string, number, number]>; products: DemoProduct[] };

const SELLERS: DemoSeller[] = [
  {
    slug: "buildrite",
    name: "BuildRite Supplies",
    city: "Apapa",
    state: "Lagos",
    address: "14 Wharf Road",
    plate: "LND-501XA",
    truck: ["DAF", "XF 480"],
    payloadKg: 30_000,
    rates: [
      ["Lagos", 15_000, 10_000],
      ["Ogun", 22_000, 15_000],
      ["Oyo", 30_000, 20_000],
      ["FCT", 65_000, 40_000],
      ["Kano", 85_000, 50_000],
    ],
    products: [
      { title: "Portland cement 42.5R", description: "General purpose cement in sealed 50 kg bags. Suitable for blocks, plaster and structural concrete. Stored dry and palletised at our Apapa yard.", category: "construction_materials", unitLabel: "50 kg bag", unitWeightKg: 50, naira: 10_500, stock: 2_400, minimum: 20, image: IMAGES.construction },
      { title: "Granite chippings 3/4 inch", description: "Washed and graded crushed granite for concrete and road base. Sold by the tonne in woven bulk bags and loaded by forklift.", category: "construction_materials", unitLabel: "1 tonne bag", unitWeightKg: 1_000, naira: 38_000, stock: 180, minimum: 2, image: IMAGES.construction },
      { title: "Y12 reinforcement bars", description: "High tensile 12 mm iron rods in 12 metre lengths, sold in bundles of ten. Mill certificate available on request.", category: "construction_materials", unitLabel: "bundle of 10", unitWeightKg: 106, naira: 92_000, stock: 300, minimum: 5, image: IMAGES.warehouse },
      { title: "Long span aluminium roofing sheets", description: "0.55 mm stone grey long span sheets, cut to 3.6 metres and packed in bundles of 20. Includes ridge caps on orders above ten bundles.", category: "construction_materials", unitLabel: "bundle of 20", unitWeightKg: 90, naira: 148_000, stock: 75, minimum: 1, image: IMAGES.warehouse },
    ],
  },
  {
    slug: "greenbelt",
    name: "Green Belt Farms",
    city: "Kaduna",
    state: "Kaduna",
    address: "Km 8 Zaria Road",
    plate: "KAD-224TF",
    truck: ["MAN", "TGS 26.440"],
    payloadKg: 25_000,
    rates: [
      ["Kaduna", 12_000, 8_000],
      ["Kano", 22_000, 15_000],
      ["FCT", 30_000, 20_000],
      ["Lagos", 70_000, 45_000],
      ["Rivers", 80_000, 50_000],
    ],
    products: [
      { title: "Yellow maize, 100 kg bag", description: "Machine dried yellow maize from this season's harvest, cleaned and bagged. Moisture below 13 percent, ready for feed mills and traders.", category: "agricultural_produce", unitLabel: "100 kg bag", unitWeightKg: 100, naira: 62_000, stock: 800, minimum: 5, image: IMAGES.agriculture },
      { title: "Parboiled rice, 50 kg bag", description: "Stone free long grain parboiled rice milled in Kaduna. Sealed bags with a 12 month shelf life.", category: "agricultural_produce", unitLabel: "50 kg bag", unitWeightKg: 50, naira: 71_000, stock: 650, minimum: 2, image: IMAGES.agriculture },
      { title: "Soya beans, 100 kg bag", description: "Cleaned soya beans for oil mills and feed producers. Graded and bagged at our Zaria Road store.", category: "agricultural_produce", unitLabel: "100 kg bag", unitWeightKg: 100, naira: 88_000, stock: 240, minimum: 5, image: IMAGES.agriculture },
    ],
  },
  {
    slug: "harbour",
    name: "Harbour Wholesale",
    city: "Onitsha",
    state: "Anambra",
    address: "22 Port Harcourt Road",
    plate: "ANB-318KJ",
    truck: ["Sinotruk", "Howo 371"],
    payloadKg: 20_000,
    rates: [
      ["Anambra", 12_000, 8_000],
      ["Enugu", 18_000, 12_000],
      ["Rivers", 28_000, 18_000],
      ["Lagos", 55_000, 35_000],
      ["FCT", 50_000, 35_000],
    ],
    products: [
      { title: "Vegetable oil, 25 litre keg", description: "Refined vegetable oil in sealed 25 litre kegs. Sold by the pallet to shops, bakers and caterers.", category: "packaged_food", unitLabel: "25 litre keg", unitWeightKg: 24, naira: 41_000, stock: 500, minimum: 4, image: IMAGES.retail },
      { title: "Tomato paste, carton of 50", description: "210 g tins of double concentrate tomato paste, packed in cartons of 50 for wholesale buyers.", category: "packaged_food", unitLabel: "carton of 50", unitWeightKg: 12, naira: 26_500, stock: 900, minimum: 10, image: IMAGES.retail },
    ],
  },
];

async function uploadPhoto(client: S3Client | null, image: SiteImage, productId: string): Promise<{ storageKey: string; sizeBytes: number } | null> {
  if (!client) {
    return null;
  }
  try {
    const separator = image.src.includes("?") ? "&" : "?";
    const response = await fetch(`${image.src}${separator}w=900&fm=jpg&q=75`);
    if (!response.ok) {
      return null;
    }
    const body = Buffer.from(await response.arrayBuffer());
    const storageKey = `products/${productId}/${randomUUID()}.jpg`;
    await client.send(new PutObjectCommand({ Bucket: process.env.STORAGE_BUCKET, Key: storageKey, Body: body, ContentType: "image/jpeg", ContentLength: body.length }));
    return { storageKey, sizeBytes: body.length };
  } catch (error) {
    console.warn(`Skipped a photo: ${error instanceof Error ? error.message : "upload failed"}`);
    return null;
  }
}

function storageClient(): S3Client | null {
  const { STORAGE_REGION, STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_BUCKET, STORAGE_FORCE_PATH_STYLE } = process.env;
  if (!STORAGE_REGION || !STORAGE_ACCESS_KEY_ID || !STORAGE_SECRET_ACCESS_KEY || !STORAGE_BUCKET) {
    return null;
  }
  return new S3Client({
    region: STORAGE_REGION,
    endpoint: STORAGE_ENDPOINT || undefined,
    forcePathStyle: STORAGE_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: STORAGE_ACCESS_KEY_ID, secretAccessKey: STORAGE_SECRET_ACCESS_KEY },
  });
}

async function main() {
  const raw = databaseUrl(process.env, "migrations");
  if (!raw) {
    throw new Error("DATABASE_URL or POSTGRES_URL_NON_POOLING is required");
  }
  const { url, prepare } = connectionSettings(raw);
  const sql = postgres(url, { max: 1, prepare });
  const client = storageClient();
  try {
    for (const seller of SELLERS) {
      const email = `demo-${seller.slug}@example.com`;
      const [existing] = await sql<{ id: string }[]>`select id from users where email = ${email}`;
      if (existing) {
        let added = 0;
        for (const product of seller.products) {
          const [missing] = await sql<{ id: string }[]>`
            select p.id from products p
            join vendor_profiles v on v.id = p.vendor_id
            where v.user_id = ${existing.id} and p.title = ${product.title}
              and not exists (select 1 from product_photos ph where ph.product_id = p.id)`;
          const photo = missing ? await uploadPhoto(client, product.image, missing.id) : null;
          if (missing && photo) {
            await sql`insert into product_photos (product_id, storage_key, content_type, size_bytes) values (${missing.id}, ${photo.storageKey}, 'image/jpeg', ${photo.sizeBytes})`;
            added += 1;
          }
        }
        console.log(`${seller.name} already exists, added ${added} missing photo${added === 1 ? "" : "s"}.`);
        continue;
      }
      const [user] = await sql<{ id: string }[]>`insert into users (email, full_name, role) values (${email}, ${seller.name}, 'vendor') returning id`;
      const [vendor] = await sql<{ id: string }[]>`
        insert into vendor_profiles (user_id, category, legal_name, business_name, email, address_line, city, state, operating_states, id_document_type, id_document_reference_last4, verification_status, submitted_at, reviewed_at)
        values (${user.id}, 'logistics_company', ${seller.name}, ${seller.name}, ${email}, ${seller.address}, ${seller.city}, ${seller.state}, ${seller.rates.map(([state]) => state)}, 'nin', '0000', 'verified', now(), now())
        returning id`;
      await sql`
        insert into trucks (vendor_id, registration_number, registration_normalized, make, model, year, category, tyre_count, max_payload_kg, body_type, cargo_types, base_state, base_city, listing_status, submitted_at, reviewed_at)
        values (${vendor.id}, ${seller.plate}, ${seller.plate.replace(/[^A-Z0-9]/g, "")}, ${seller.truck[0]}, ${seller.truck[1]}, 2021, 'heavy_duty', 10, ${seller.payloadKg}, 'enclosed', ${["general_goods", "construction_materials", "agricultural_produce", "packaged_food"]}, ${seller.state}, ${seller.city}, 'active', now(), now())`;
      for (const [state, ratePerTonne, minimum] of seller.rates) {
        await sql`insert into delivery_rates (vendor_id, destination_state, rate_per_tonne_kobo, minimum_charge_kobo) values (${vendor.id}, ${state}, ${ratePerTonne * 100}, ${minimum * 100})`;
      }
      for (const product of seller.products) {
        const [row] = await sql<{ id: string }[]>`
          insert into products (vendor_id, title, description, category, unit_label, unit_weight_kg, price_kobo, stock_units, min_order_units)
          values (${vendor.id}, ${product.title}, ${product.description}, ${product.category}, ${product.unitLabel}, ${product.unitWeightKg}, ${product.naira * 100}, ${product.stock}, ${product.minimum})
          returning id`;
        const photo = await uploadPhoto(client, product.image, row.id);
        if (photo) {
          await sql`insert into product_photos (product_id, storage_key, content_type, size_bytes) values (${row.id}, ${photo.storageKey}, 'image/jpeg', ${photo.sizeBytes})`;
        }
      }
      console.log(`Added ${seller.name} with ${seller.products.length} products.`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
