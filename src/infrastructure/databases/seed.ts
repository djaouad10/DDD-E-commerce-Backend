// Seed script for the e-commerce schema (categories, products, variations,
// cart items, orders with embedded shipping + per-item weight/price
// snapshots, order items, ratings)

import { db } from "#/infrastructure/config/database.js";
import { auth } from "#/infrastructure/config/auth.js";
import {
  user,
  account,
  session,
  verification,
  category,
  file,
  product,
  variation,
  cartItem,
  order,
  orderItem,
  rating,
  outbox,
} from "#/infrastructure/databases/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const IMAGE_URL =
  "https://ihcsn38gr8.ufs.sh/f/SpyYY0hniRCQXH1pv7N7umRYkIJGv1Bzgr93SFe2nMwpxPtZ";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function uuid() {
  return randomUUID();
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function shuffle<T>(arr: readonly T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ------------------------------------------------------------------ */
/*  Static catalog data                                                */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  "T-Shirts",
  "Jeans",
  "Jackets",
  "Sneakers",
  "Dresses",
  "Hoodies",
  "Accessories",
] as const;

const SIZES_CLOTHING = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;
const SIZES_SHOES = [
  "EU_36",
  "EU_37",
  "EU_38",
  "EU_39",
  "EU_40",
  "EU_41",
  "EU_42",
  "EU_43",
] as const;

const COLORS = [
  "BLACK",
  "WHITE",
  "GRAY",
  "RED",
  "BLUE",
  "GREEN",
  "YELLOW",
  "ORANGE",
  "PURPLE",
  "PINK",
  "BROWN",
  "BEIGE",
  "NAVY",
  "MAROON",
  "TEAL",
] as const;

type ProductSeed = {
  name: string;
  description: string;
  category: (typeof CATEGORIES)[number];
  brand: string;
  material: string;
  price: number;
  discountPrice?: number;
  isShoe?: boolean;
};

const PRODUCTS: ProductSeed[] = [
  {
    name: "Classic Crewneck Tee",
    description:
      "A soft, breathable cotton t-shirt designed for everyday comfort. Pre-shrunk and built to keep its shape wash after wash.",
    category: "T-Shirts",
    brand: "Urban Thread",
    material: "100% Cotton",
    price: 2500,
    discountPrice: 1999,
  },
  {
    name: "Oversized Graphic Tee",
    description:
      "Relaxed-fit tee with a bold front print, made from heavyweight cotton jersey for a streetwear feel.",
    category: "T-Shirts",
    brand: "Nova Apparel",
    material: "100% Cotton",
    price: 2900,
  },
  {
    name: "Slim Fit Stretch Jeans",
    description:
      "Tapered, slim-fit denim with a touch of stretch for all-day mobility and a modern silhouette.",
    category: "Jeans",
    brand: "Denim Co.",
    material: "98% Cotton, 2% Elastane",
    price: 6500,
    discountPrice: 5499,
  },
  {
    name: "Straight Leg Raw Denim",
    description:
      "Classic straight-leg jeans cut from raw selvedge denim that develops a unique fade over time.",
    category: "Jeans",
    brand: "Heritage Denim",
    material: "100% Cotton",
    price: 8900,
  },
  {
    name: "Quilted Bomber Jacket",
    description:
      "Lightweight quilted bomber with ribbed cuffs and hem, perfect for layering in cooler weather.",
    category: "Jackets",
    brand: "Northbound",
    material: "Polyester Shell, Polyfill Lining",
    price: 9500,
    discountPrice: 7999,
  },
  {
    name: "Waxed Cotton Field Jacket",
    description:
      "Durable waxed-cotton jacket with multiple utility pockets, built for unpredictable weather.",
    category: "Jackets",
    brand: "Northbound",
    material: "Waxed Cotton",
    price: 12500,
  },
  {
    name: "Court Classic Sneakers",
    description:
      "Low-top leather sneakers with a cushioned sole, designed for a clean look that goes with everything.",
    category: "Sneakers",
    brand: "StrideOne",
    material: "Leather Upper, Rubber Sole",
    price: 7900,
    isShoe: true,
  },
  {
    name: "Trail Runner Sneakers",
    description:
      "Lightweight performance sneakers with breathable mesh and a grippy outsole for everyday training.",
    category: "Sneakers",
    brand: "StrideOne",
    material: "Mesh Upper, EVA Midsole",
    price: 8900,
    discountPrice: 7499,
    isShoe: true,
  },
  {
    name: "Wrap Midi Dress",
    description:
      "Flowing midi dress with a flattering wrap silhouette, finished in a lightweight viscose blend.",
    category: "Dresses",
    brand: "Maison Aria",
    material: "Viscose Blend",
    price: 7500,
  },
  {
    name: "Linen Summer Dress",
    description:
      "Breathable linen dress with an A-line cut, ideal for warm-weather days.",
    category: "Dresses",
    brand: "Maison Aria",
    material: "100% Linen",
    price: 6900,
    discountPrice: 5999,
  },
  {
    name: "Fleece Pullover Hoodie",
    description:
      "Heavyweight brushed fleece hoodie with a kangaroo pocket and adjustable drawstring hood.",
    category: "Hoodies",
    brand: "Urban Thread",
    material: "80% Cotton, 20% Polyester",
    price: 5500,
  },
  {
    name: "Zip-Up Tech Hoodie",
    description:
      "Performance hoodie with a water-resistant finish and zippered chest pocket.",
    category: "Hoodies",
    brand: "Nova Apparel",
    material: "Polyester Blend",
    price: 6200,
    discountPrice: 4999,
  },
  {
    name: "Leather Belt",
    description:
      "Full-grain leather belt with a brushed metal buckle, handcrafted to last for years.",
    category: "Accessories",
    brand: "Heritage Denim",
    material: "Full-Grain Leather",
    price: 2200,
  },
  {
    name: "Wool Beanie",
    description:
      "Ribbed-knit beanie made from soft merino wool, designed to keep you warm without the itch.",
    category: "Accessories",
    brand: "Northbound",
    material: "100% Merino Wool",
    price: 1800,
  },
];

// Algerian wilaya codes used inside the order's embedded shipping_details
const WILAYAS = [
  { code: 16, commune: "Bab Ezzouar" },
  { code: 31, commune: "Es Senia" },
  { code: 25, commune: "El Khroub" },
  { code: 9, commune: "Blida" },
  { code: 6, commune: "Bejaia" },
];

const DELIVERY_TYPES = ["TO_HOME", "TO_DESK"] as const;

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PRE_TRANSIT",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
] as const;

const REVIEW_COMMENTS = [
  "Great quality, fits true to size!",
  "Loved the material, will buy again.",
  "Good product but delivery took a while.",
  "Exactly as pictured, very happy with it.",
  "Decent quality for the price.",
];

/* ------------------------------------------------------------------ */
/*  Seed runner                                                         */
/* ------------------------------------------------------------------ */
async function seed() {
  console.log("🌱 Seeding database...");

  /* --------------------------- Clear DB ---------------------------- */
  // order_item -> variation is ON DELETE RESTRICT now, so order_item must
  // be cleared before variation (it already was — keeping that order).
  await db.delete(outbox);
  await db.delete(rating);
  await db.delete(orderItem);
  await db.delete(order);
  await db.delete(cartItem);
  await db.delete(variation);
  await db.delete(file);
  await db.delete(product);
  await db.delete(category);
  await db.delete(account);
  await db.delete(session);
  await db.delete(verification);
  await db.delete(user);

  console.log("✅ Database cleared");

  /* --------------------------- Categories --------------------------- */
  console.log(`→ Inserting ${CATEGORIES.length} categories`);
  const categoryMap = new Map<string, string>();
  const categoryRows = CATEGORIES.map((name) => ({ id: uuid(), name }));
  await db.insert(category).values(categoryRows);
  for (const row of categoryRows) categoryMap.set(row.name, row.id);
  console.log(`  ✓ ${categoryRows.length} categories inserted`);

  /* --------------------------- Users --------------------------------- */
  console.log("→ Creating users via Better Auth");

  const adminDefs = [
    { email: "admin@gmail.com", name: "Admin", password: "admin123" },
    { email: "admin1@gmail.com", name: "Admin One", password: "admin123" },
  ];
  const clientDefs = [
    { email: "client@gmail.com", name: "Client", password: "client123" },
    { email: "client1@gmail.com", name: "Client One", password: "client123" },
    { email: "client2@gmail.com", name: "Client Two", password: "client123" },
    {
      email: "client3@gmail.com",
      name: "Client Three",
      password: "client123",
    },
    {
      email: "client4@gmail.com",
      name: "Client Four",
      password: "client123",
    },
  ];

  const createdAdmins: Array<{ id: string; email: string; name: string }> = [];
  const createdClients: Array<{ id: string; email: string; name: string }> = [];

  for (const a of adminDefs) {
    const result = await auth.api.signUpEmail({
      body: { email: a.email, name: a.name, password: a.password },
    });
    await db
      .update(user)
      .set({ role: "ADMIN", emailVerified: true })
      .where(eq(user.id, result.user.id));
    createdAdmins.push({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    });
  }
  for (const c of clientDefs) {
    const result = await auth.api.signUpEmail({
      body: { email: c.email, name: c.name, password: c.password },
    });
    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.id, result.user.id));
    createdClients.push({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    });
  }

  console.log(
    `✅ Created ${createdAdmins.length} admins and ${createdClients.length} clients`,
  );

  /* --------------------------- Products ------------------------------ */
  console.log(`→ Inserting ${PRODUCTS.length} products`);

  const createdProducts: Array<{
    id: string;
    name: string;
    price: number;
    discountPrice: number | null;
    isShoe: boolean;
  }> = [];

  for (const p of PRODUCTS) {
    const id = uuid();
    await db.insert(product).values({
      id,
      name: p.name,
      slug: slugify(p.name),
      description: p.description,
      categoryId: categoryMap.get(p.category) ?? null,
      brand: p.brand,
      material: p.material,
      price: p.price,
      discount_price: p.discountPrice ?? null,
    });
    createdProducts.push({
      id,
      name: p.name,
      price: p.price,
      discountPrice: p.discountPrice ?? null,
      isShoe: !!p.isShoe,
    });
  }
  console.log(`  ✓ ${createdProducts.length} products inserted`);

  /* --------------------------- Variations ----------------------------- */
  // available_qty is no longer a stored column (it's presumably derived as
  // total_qty - reserved_qty at read time), so we only compute it locally
  // here to bound the random cart/order quantities below.
  console.log("→ Inserting variations");

  const allVariations: Array<{
    id: string;
    product_id: string;
    price: number;
    discountPrice: number | null;
    weight_in_grams: number;
    availableForSeed: number;
  }> = [];

  for (const prod of createdProducts) {
    const sizes = prod.isShoe ? SIZES_SHOES : SIZES_CLOTHING;
    const colorCount = randomInt(2, 3);
    const pickedColors = shuffle(COLORS).slice(0, colorCount);

    const variationRows = [];
    for (const colorVal of pickedColors) {
      for (const sizeVal of sizes) {
        const total = randomInt(5, 40);
        const reserved = randomInt(0, Math.min(5, total));
        const weight = prod.isShoe ? randomInt(600, 1200) : randomInt(150, 900);
        variationRows.push({
          id: uuid(),
          product_id: prod.id,
          size: sizeVal,
          color: colorVal,
          total_qty: total,
          reserved_qty: reserved,
          weight_in_grams: weight,
        });
      }
    }
    await db.insert(variation).values(variationRows);
    allVariations.push(
      ...variationRows.map((v) => ({
        id: v.id,
        product_id: v.product_id,
        price: prod.price,
        discountPrice: prod.discountPrice,
        weight_in_grams: v.weight_in_grams,
        availableForSeed: v.total_qty - v.reserved_qty,
      })),
    );
  }
  console.log(`  ✓ ${allVariations.length} variations inserted`);

  /* --------------------------- Files / Images -------------------------- */
  // `color` was dropped from the file table — images are no longer tagged
  // per-color, so we just seed a main + alternate shot per product.
  console.log("→ Inserting product images");

  for (const prod of createdProducts) {
    const base = prod.id.slice(0, 8);
    await db.insert(file).values({
      key: `img_${base}_main`,
      name: `${prod.name} main photo`,
      public_url: IMAGE_URL,
      product_id: prod.id,
      is_main: true,
    });
    await db.insert(file).values({
      key: `img_${base}_alt`,
      name: `${prod.name} alternate photo`,
      public_url: IMAGE_URL,
      product_id: prod.id,
      is_main: false,
    });
  }
  console.log(`  ✓ ${createdProducts.length * 2} images inserted`);

  /* --------------------------- Cart Items ------------------------------ */
  console.log("→ Inserting cart items");

  const cartRows: Array<{
    id: string;
    user_id: string;
    variation_id: string;
    selected_qty: number;
  }> = [];
  for (const client of createdClients) {
    const itemCount = randomInt(1, 3);
    const pickedVariations = shuffle(allVariations).slice(0, itemCount);
    for (const v of pickedVariations) {
      cartRows.push({
        id: uuid(),
        user_id: client.id,
        variation_id: v.id,
        selected_qty: randomInt(
          1,
          Math.max(1, Math.min(3, v.availableForSeed)),
        ),
      });
    }
  }
  if (cartRows.length) await db.insert(cartItem).values(cartRows);
  console.log(`  ✓ ${cartRows.length} cart items inserted`);

  /* --------------------------- Orders + Order Items --------------------- */
  // total_order_price / total_products_price / total_weight_in_kg no longer
  // live on `order` — they're derivable from order_item rows, which now
  // each carry their own price/discount/weight snapshot. shipping_details
  // is an embedded jsonb snapshot rather than a separate table/FK.
  console.log("→ Inserting orders and order items");

  let ordersInserted = 0;
  let orderItemsInserted = 0;
  let outboxEventsInserted = 0;

  for (let i = 0; i < createdClients.length; i++) {
    const client = createdClients[i]!;
    const wilaya = randomFrom(WILAYAS);

    const shippingDetailsPayload = {
      id: uuid(),
      full_name: client.name,
      first_phone: `0550${randomInt(100000, 999999)}`,
      second_phone: null,
      code_wilaya: wilaya.code,
      commune: wilaya.commune,
      code_postal: `${wilaya.code}000`,
      address: `${randomInt(1, 200)} Rue de l'Indépendance`,
      gps_link: null,
      client_note: i === 0 ? "Please call before delivery." : null,
      delivery_type: DELIVERY_TYPES[i % DELIVERY_TYPES.length]!,
      fragile: false,
    };

    const itemCount = randomInt(1, 3);
    const pickedVariations = shuffle(allVariations).slice(0, itemCount);
    const shippingPrice = 600;

    const orderId = uuid();
    const status = randomFrom(ORDER_STATUSES);

    await db.insert(order).values({
      id: orderId,
      tracking_number: `OV${randomInt(100000, 999999)}`,
      status,
      shipping_status: null,
      user_id: client.id,
      shipping_price_at_order_time: shippingPrice,
      selected_shipping_provider: "WORLD_EXPRESS",
      shipping_details: shippingDetailsPayload,
    });
    ordersInserted++;

    const orderItemRows = pickedVariations.map((v) => ({
      id: uuid(),
      orderId,
      variation_id: v.id,
      qty: randomInt(1, 2),
      unit_price_at_order_time: v.price,
      unit_discount_price_at_order_time: v.discountPrice,
      // weight_at_order_time is assumed to be kg (real, matching the old
      // order-level total_weight_in_kg convention) — flip this to grams if
      // your column actually expects the raw gram value instead.
      weight_at_order_time: v.weight_in_grams / 1000,
    }));
    await db.insert(orderItem).values(orderItemRows);
    orderItemsInserted += orderItemRows.length;

    // Optional: drop a matching outbox event for confirmed orders so the
    // worker/consumer has something pending to process out of the box.
    if (status === "CONFIRMED") {
      await db.insert(outbox).values({
        event_type: "order.confirmed",
        payload: { orderId, user_id: client.id },
        status: "pending",
      });
      outboxEventsInserted++;
    }
  }
  console.log(
    `  ✓ ${ordersInserted} orders, ${orderItemsInserted} order items, and ${outboxEventsInserted} outbox events inserted`,
  );

  /* --------------------------- Ratings ----------------------------------- */
  console.log("→ Inserting ratings");

  const ratingRows: Array<{
    user_id: string;
    product_id: string;
    rating: number;
    comment: string;
    is_approved: boolean;
  }> = [];
  for (const client of createdClients) {
    const ratedProducts = shuffle(createdProducts).slice(0, randomInt(1, 2));
    for (const prod of ratedProducts) {
      ratingRows.push({
        user_id: client.id,
        product_id: prod.id,
        rating: randomInt(3, 5),
        comment: randomFrom(REVIEW_COMMENTS),
        is_approved: Math.random() > 0.3,
      });
    }
  }
  if (ratingRows.length) await db.insert(rating).values(ratingRows);
  console.log(`  ✓ ${ratingRows.length} ratings inserted`);

  console.log("🎉 Seed completed successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
