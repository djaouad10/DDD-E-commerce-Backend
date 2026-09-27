import { eq } from "drizzle-orm";

// Domain entities
import { Category } from "#/domain/entities/category.js";
import { Product } from "#/domain/entities/product.js";
import { Variation } from "#/domain/entities/variation.js";
import { File } from "#/domain/entities/file.js";
import { CartItem } from "#/domain/entities/cart-item.js";
import { Order } from "#/domain/entities/order.js";
import { OrderItem } from "#/domain/entities/order-item.js";
import { Rating } from "#/domain/entities/rating.js";

// Value objects
import { ProductId } from "#/domain/value-objects/product-id.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { Money } from "#/domain/value-objects/money.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { Slug } from "#/domain/value-objects/slug.js";
import { ShippingDetails } from "#/domain/value-objects/shipping-details.js";
import { Size, Color } from "#/domain/entities/product.js";

// API container (regular tables)
import { buildApiContainer } from "#/composition/roots/api.composition.js";
import {
  CATEGORY_REPOSITORY,
  PRODUCT_REPOSITORY,
  ORDER_REPOSITORY,
  RATING_REPOSITORY,
  CART_REPOSITORY,
  BETTER_AUTH,
  DRIZZLE_DB,
} from "#/composition/utils/tokens.js";

// Embedding queue container (real Gemini embedding + upsert, same path as production)
import { buildEmbeddingQueueHandlerContainer } from "#/composition/roots/embedding-queue-handler.composition.js";
import { EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE } from "#/composition/utils/tokens.js";
import { EmbeddingQueueProductUpsertedEventsHandlerCommand } from "#/application/commands/embedding-queue-handlers/embedding-queue-product-created-event-handler.command.js";

// Schema (for direct deletes)
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
  productEmbeddings,
} from "#/infrastructure/databases/schema.js";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const IMAGE_URL =
  "https://ihcsn38gr8.ufs.sh/f/SpyYY0hniRCQXH1pv7N7umRYkIJGv1Bzgr93SFe2nMwpxPtZ";

// Gemini free-tier embed_content quota is metered per minute. These two
// numbers together are what actually prevent 429s:
//  - EMBEDDING_MIN_INTERVAL_MS spaces out *every* call (success or not) so
//    you never approach the ceiling in normal operation.
//  - EMBEDDING_RATE_LIMIT_COOLDOWN_MS is how long we wait before retrying a
//    product that got a 429, since the quota window is per-minute and a
//    short pause won't have actually cleared it.
const EMBEDDING_MIN_INTERVAL_MS = 800; // ~75 req/min steady-state, under the 100/min free-tier cap
const EMBEDDING_MAX_RETRIES = 5;
const EMBEDDING_RATE_LIMIT_COOLDOWN_MS = 65_000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /rate limit|429|RESOURCE_EXHAUSTED|quota/i.test(message);
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

/* ------------------------------------------------------------------ */
/*  50 products in 10 clusters of 5.                                   */
/*  Clusters that share a category deliberately reuse similar          */
/*  vocabulary so you can test whether semantic search actually        */
/*  discriminates between them (e.g. "running" vs "basketball"         */
/*  sneakers, "waterproof outdoor" vs "fashion bomber" jackets).        */
/* ------------------------------------------------------------------ */

type Cluster = {
  category: (typeof CATEGORIES)[number];
  brand: string;
  material: string;
  isShoe?: boolean;
  basePrice: number;
  priceStep: number;
  discount: readonly (number | null)[]; // discount amount per variant, null = no discount
  items: readonly { name: string; description: string }[];
};

const CLUSTERS: Cluster[] = [
  // --- Sneakers / Running (StrideOne) ---------------------------------
  {
    category: "Sneakers",
    brand: "StrideOne",
    material: "Mesh Upper, EVA Midsole",
    isShoe: true,
    basePrice: 7900,
    priceStep: 300,
    discount: [null, 500, null, 700, null],
    items: [
      {
        name: "Trail Runner Sneakers",
        description:
          "Lightweight performance running sneakers with breathable mesh and a grippy outsole for daily training.",
      },
      {
        name: "Road Runner Sneakers",
        description:
          "Cushioned running sneakers built for pavement mileage, with a breathable mesh upper and responsive foam.",
      },
      {
        name: "Marathon Runner Sneakers",
        description:
          "Long-distance running sneakers with extra cushioning and a breathable mesh upper for daily training.",
      },
      {
        name: "Sprint Runner Sneakers",
        description:
          "Featherweight running sneakers with a snug mesh upper, tuned for speed workouts and daily training.",
      },
      {
        name: "Trail Blazer Runner Sneakers",
        description:
          "Off-road running sneakers with a rugged grippy outsole and breathable mesh upper for daily training.",
      },
    ],
  },
  // --- Sneakers / Basketball (HoopKing) --------------------------------
  {
    category: "Sneakers",
    brand: "HoopKing",
    material: "Synthetic Leather, Air Cushion Sole",
    isShoe: true,
    basePrice: 11500,
    priceStep: 500,
    discount: [1000, null, 1200, null, null],
    items: [
      {
        name: "Court Dominator Sneakers",
        description:
          "High-top basketball sneakers with an air cushion sole for impact protection during aggressive play.",
      },
      {
        name: "Baseline Pro Sneakers",
        description:
          "Mid-top basketball sneakers offering ankle support and an air cushion sole for aggressive play.",
      },
      {
        name: "Rim Attacker Sneakers",
        description:
          "High-top basketball sneakers built for explosive jumps, with an air cushion sole for aggressive play.",
      },
      {
        name: "Paint King Sneakers",
        description:
          "Wide-base basketball sneakers for stability in the post, with an air cushion sole for aggressive play.",
      },
      {
        name: "Fast Break Sneakers",
        description:
          "Low-top basketball sneakers built for quick cuts, with an air cushion sole for aggressive play.",
      },
    ],
  },
  // --- Jeans / Slim Stretch (Denim Co.) --------------------------------
  {
    category: "Jeans",
    brand: "Denim Co.",
    material: "98% Cotton, 2% Elastane",
    basePrice: 6200,
    priceStep: 250,
    discount: [null, 900, null, 800, null],
    items: [
      {
        name: "Slim Fit Stretch Jeans",
        description:
          "Tapered slim-fit denim with a touch of stretch for all-day mobility and a modern silhouette.",
      },
      {
        name: "Skinny Fit Stretch Jeans",
        description:
          "Skinny-cut denim with added stretch for a close fit and all-day mobility.",
      },
      {
        name: "Athletic Slim Stretch Jeans",
        description:
          "Slim-fit denim roomier through the thigh, with stretch for all-day mobility and a modern silhouette.",
      },
      {
        name: "Slim Tapered Stretch Jeans",
        description:
          "Slim through the hip and tapered at the ankle, with stretch denim for all-day mobility.",
      },
      {
        name: "Comfort Slim Stretch Jeans",
        description:
          "Slim-fit denim with a soft stretch blend, built for all-day mobility and a modern silhouette.",
      },
    ],
  },
  // --- Jeans / Raw Selvedge (Heritage Denim) ---------------------------
  {
    category: "Jeans",
    brand: "Heritage Denim",
    material: "100% Cotton",
    basePrice: 8900,
    priceStep: 400,
    discount: [null, null, 1000, null, 1100],
    items: [
      {
        name: "Straight Leg Raw Denim",
        description:
          "Classic straight-leg jeans cut from raw selvedge denim that develops a unique fade over time.",
      },
      {
        name: "Relaxed Raw Selvedge Denim",
        description:
          "Roomier relaxed-fit jeans in raw selvedge denim that develops a unique fade over time.",
      },
      {
        name: "Loose Taper Raw Denim",
        description:
          "Loose through the leg and tapered at the hem, cut from raw selvedge denim that fades uniquely over time.",
      },
      {
        name: "Bootcut Raw Selvedge Denim",
        description:
          "Bootcut jeans cut from raw selvedge denim that develops a unique fade with wear over time.",
      },
      {
        name: "Original Fit Raw Denim",
        description:
          "True-to-vintage straight cut in raw selvedge denim that develops a unique fade over time.",
      },
    ],
  },
  // --- T-Shirts / Graphic (Nova Apparel) -------------------------------
  {
    category: "T-Shirts",
    brand: "Nova Apparel",
    material: "100% Cotton",
    basePrice: 2700,
    priceStep: 150,
    discount: [null, 400, null, null, 350],
    items: [
      {
        name: "Oversized Graphic Tee",
        description:
          "Relaxed-fit tee with a bold front print, made from heavyweight cotton jersey for a streetwear feel.",
      },
      {
        name: "Retro Print Graphic Tee",
        description:
          "Relaxed-fit tee featuring a retro-inspired print, made from heavyweight cotton jersey for a streetwear feel.",
      },
      {
        name: "Photo Print Graphic Tee",
        description:
          "Relaxed-fit tee with an all-over photo print, made from heavyweight cotton jersey for a streetwear feel.",
      },
      {
        name: "Typography Graphic Tee",
        description:
          "Relaxed-fit tee with bold typography across the chest, made from heavyweight cotton jersey for a streetwear feel.",
      },
      {
        name: "Splatter Print Graphic Tee",
        description:
          "Relaxed-fit tee with an abstract splatter print, made from heavyweight cotton jersey for a streetwear feel.",
      },
    ],
  },
  // --- T-Shirts / Basics (Urban Thread) --------------------------------
  {
    category: "T-Shirts",
    brand: "Urban Thread",
    material: "100% Cotton",
    basePrice: 2000,
    priceStep: 100,
    discount: [500, null, 450, null, null],
    items: [
      {
        name: "Classic Crewneck Tee",
        description:
          "A soft, breathable cotton t-shirt designed for everyday comfort, pre-shrunk to keep its shape wash after wash.",
      },
      {
        name: "Essential V-Neck Tee",
        description:
          "A soft, breathable cotton v-neck designed for everyday comfort, pre-shrunk to keep its shape wash after wash.",
      },
      {
        name: "Basic Long Sleeve Tee",
        description:
          "A soft, breathable long-sleeve cotton tee for everyday comfort, pre-shrunk to keep its shape wash after wash.",
      },
      {
        name: "Everyday Crewneck Tee",
        description:
          "A soft, breathable cotton tee built for daily wear, pre-shrunk to keep its shape wash after wash.",
      },
      {
        name: "Slim Fit Basic Tee",
        description:
          "A close-cut, breathable cotton tee for everyday comfort, pre-shrunk to keep its shape wash after wash.",
      },
    ],
  },
  // --- Jackets / Waterproof Outdoor (Northbound) -----------------------
  {
    category: "Jackets",
    brand: "Northbound",
    material: "Waxed Cotton",
    basePrice: 11500,
    priceStep: 500,
    discount: [null, 1500, null, 1300, null],
    items: [
      {
        name: "Waxed Cotton Field Jacket",
        description:
          "Durable waterproof waxed-cotton jacket with multiple utility pockets, built for unpredictable weather outdoors.",
      },
      {
        name: "Storm Shell Field Jacket",
        description:
          "Waterproof outdoor jacket with sealed seams and utility pockets, built for unpredictable weather.",
      },
      {
        name: "Alpine Trek Field Jacket",
        description:
          "Waterproof hiking jacket with a packable hood and utility pockets, built for unpredictable mountain weather.",
      },
      {
        name: "Rain Guard Field Jacket",
        description:
          "Waterproof outdoor jacket with a taped hood and utility pockets, built for unpredictable weather.",
      },
      {
        name: "Expedition Field Jacket",
        description:
          "Heavy-duty waterproof jacket with reinforced utility pockets, built for unpredictable outdoor weather.",
      },
    ],
  },
  // --- Jackets / Fashion Bomber (CityEdge) ------------------------------
  {
    category: "Jackets",
    brand: "CityEdge",
    material: "Polyester Shell, Polyfill Lining",
    basePrice: 8500,
    priceStep: 300,
    discount: [1000, null, null, 900, null],
    items: [
      {
        name: "Quilted Bomber Jacket",
        description:
          "Lightweight quilted bomber with ribbed cuffs and hem, a streetwear staple for layering in cooler weather.",
      },
      {
        name: "Satin Bomber Jacket",
        description:
          "Glossy satin-finish bomber with ribbed cuffs and hem, a streetwear staple for layering in cooler weather.",
      },
      {
        name: "Varsity Bomber Jacket",
        description:
          "Varsity-style bomber with ribbed cuffs and hem, a streetwear staple for layering in cooler weather.",
      },
      {
        name: "Reversible Bomber Jacket",
        description:
          "Two-way reversible bomber with ribbed cuffs and hem, a streetwear staple for layering in cooler weather.",
      },
      {
        name: "Cropped Bomber Jacket",
        description:
          "Cropped-cut bomber with ribbed cuffs and hem, a streetwear staple for layering in cooler weather.",
      },
    ],
  },
  // --- Hoodies (mixed brands, still one semantic family) ---------------
  {
    category: "Hoodies",
    brand: "Urban Thread",
    material: "80% Cotton, 20% Polyester",
    basePrice: 5000,
    priceStep: 300,
    discount: [null, 800, null, 700, null],
    items: [
      {
        name: "Fleece Pullover Hoodie",
        description:
          "Heavyweight brushed fleece hoodie with a kangaroo pocket and adjustable drawstring hood.",
      },
      {
        name: "Zip-Up Tech Hoodie",
        description:
          "Performance zip-up hoodie with a water-resistant finish and zippered chest pocket.",
      },
      {
        name: "Oversized Fleece Hoodie",
        description:
          "Oversized brushed fleece hoodie with a kangaroo pocket and adjustable drawstring hood.",
      },
      {
        name: "Cropped Fleece Hoodie",
        description:
          "Cropped brushed fleece hoodie with a kangaroo pocket and adjustable drawstring hood.",
      },
      {
        name: "Sherpa Lined Hoodie",
        description:
          "Sherpa-lined heavyweight hoodie with a kangaroo pocket and adjustable drawstring hood.",
      },
    ],
  },
  // --- Accessories (leather goods) --------------------------------------
  {
    category: "Accessories",
    brand: "Heritage Denim",
    material: "Full-Grain Leather",
    basePrice: 1800,
    priceStep: 200,
    discount: [null, null, 300, null, 250],
    items: [
      {
        name: "Leather Belt",
        description:
          "Full-grain leather belt with a brushed metal buckle, handcrafted to last for years.",
      },
      {
        name: "Leather Bifold Wallet",
        description:
          "Full-grain leather bifold wallet with card slots, handcrafted to last for years.",
      },
      {
        name: "Leather Card Holder",
        description:
          "Slim full-grain leather card holder, handcrafted to last for years.",
      },
      {
        name: "Leather Crossbody Strap",
        description:
          "Full-grain leather crossbody strap with brushed metal hardware, handcrafted to last for years.",
      },
      {
        name: "Leather Keychain",
        description:
          "Full-grain leather keychain fob with brushed metal hardware, handcrafted to last for years.",
      },
    ],
  },
];

const PRODUCTS: ProductSeed[] = CLUSTERS.flatMap((cluster) =>
  cluster.items.map((item, i) => ({
    name: item.name,
    description: item.description,
    category: cluster.category,
    brand: cluster.brand,
    material: cluster.material,
    isShoe: cluster.isShoe ?? false,
    price: cluster.basePrice + i * cluster.priceStep,
    ...(cluster.discount[i] != null && {
      discountPrice:
        cluster.basePrice + i * cluster.priceStep - cluster.discount[i]!,
    }),
  })),
);

// Algerian wilaya codes used inside the order's embedded shipping_details
const WILAYAS = [
  { code: 16, commune: "Bab Ezzouar" },
  { code: 31, commune: "Es Senia" },
  { code: 25, commune: "El Khroub" },
  { code: 9, commune: "Blida" },
  { code: 6, commune: "Bejaia" },
];

const DELIVERY_TYPES = ["TO_HOME", "TO_DESK"] as const;

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
  console.log("🌱 Seeding database (with real Gemini embeddings)...");

  // Regular-table container
  const container = buildApiContainer();
  const dbInstance = container.resolveSingleton(DRIZZLE_DB);
  const categoryRepo = container.resolveSingleton(CATEGORY_REPOSITORY);
  const productRepo = container.resolveSingleton(PRODUCT_REPOSITORY);
  const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
  const ratingRepo = container.resolveSingleton(RATING_REPOSITORY);
  const cartRepo = container.resolveSingleton(CART_REPOSITORY);
  const auth = await container.resolveSingleton(BETTER_AUTH);

  // Embedding container — same handler service the domain-events worker uses,
  // so seeding exercises the exact chunk -> embed(Gemini) -> upsert path.
  const embeddingContainer = buildEmbeddingQueueHandlerContainer();
  const embeddingScope = embeddingContainer.createScope();
  const embeddingService = embeddingScope.resolve(
    EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE,
  );

  /* --------------------------- Clear DB ---------------------------- */
  await dbInstance.delete(productEmbeddings);
  await dbInstance.delete(outbox);
  await dbInstance.delete(rating);
  await dbInstance.delete(orderItem);
  await dbInstance.delete(order);
  await dbInstance.delete(cartItem);
  await dbInstance.delete(variation);
  await dbInstance.delete(file);
  await dbInstance.delete(product);
  await dbInstance.delete(category);
  await dbInstance.delete(account);
  await dbInstance.delete(session);
  await dbInstance.delete(verification);
  await dbInstance.delete(user);

  console.log("✅ Database cleared");

  /* --------------------------- Categories --------------------------- */
  console.log(`→ Inserting ${CATEGORIES.length} categories`);

  const categoryMap = new Map<string, Category>();

  for (const categoryName of CATEGORIES) {
    const categoryEntity = Category.create(categoryName);
    categoryMap.set(categoryName, categoryEntity);
    await categoryRepo.save(categoryEntity, dbInstance);
  }

  console.log(`  ✓ ${CATEGORIES.length} categories inserted`);

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
    { email: "client3@gmail.com", name: "Client Three", password: "client123" },
    { email: "client4@gmail.com", name: "Client Four", password: "client123" },
  ];

  const createdAdmins: Array<{ id: string; email: string; name: string }> = [];
  const createdClients: Array<{ id: string; email: string; name: string }> = [];

  for (const a of adminDefs) {
    const result = await auth.api.signUpEmail({
      body: { email: a.email, name: a.name, password: a.password },
    });
    await dbInstance
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
    await dbInstance
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
    productEntity: Product;
  }> = [];

  for (const p of PRODUCTS) {
    const categoryEntity = categoryMap.get(p.category)!;
    const categoryId = categoryEntity.id;

    const mainImage = File.create(
      `img_${slugify(p.name)}_main`,
      `${p.name} main photo`,
      IMAGE_URL,
      true,
    );
    const altImage = File.create(
      `img_${slugify(p.name)}_alt`,
      `${p.name} alternate photo`,
      IMAGE_URL,
      false,
    );

    const sizes = p.isShoe ? SIZES_SHOES : SIZES_CLOTHING;
    const colorCount = randomInt(2, 3);
    const pickedColors = shuffle(COLORS as readonly string[]).slice(
      0,
      colorCount,
    );

    const variations: Variation[] = [];

    for (const colorVal of pickedColors) {
      for (const sizeVal of sizes) {
        const total = randomInt(5, 40);
        const reserved = randomInt(0, Math.min(5, total));
        const weight = p.isShoe ? randomInt(600, 1200) : randomInt(150, 900);

        variations.push(
          Variation.create(
            sizeVal as unknown as Size,
            colorVal as unknown as Color,
            total,
            reserved,
            Weight.of(weight, "g"),
          ),
        );
      }
    }

    const productEntity = Product.create(
      p.name,
      Slug.generate(p.name),
      categoryId,
      [mainImage, altImage],
      variations,
      p.description,
      p.brand,
      p.material,
      Money.of(p.price, "DZD"),
      p.discountPrice ? Money.of(p.discountPrice, "DZD") : null,
      null,
    );

    await productRepo.save(productEntity, dbInstance);

    createdProducts.push({
      id: productEntity.id.value,
      name: p.name,
      price: p.price,
      discountPrice: p.discountPrice ?? null,
      isShoe: !!p.isShoe,
      productEntity,
    });
  }

  console.log(`  ✓ ${createdProducts.length} products inserted`);

  /* --------------------------- Embeddings ----------------------------- */
  console.log(
    `→ Generating real Gemini embeddings for ${createdProducts.length} products`,
  );
  console.log(
    `  (throttled to one request every ${EMBEDDING_MIN_INTERVAL_MS}ms; on a 429 this will pause ${
      EMBEDDING_RATE_LIMIT_COOLDOWN_MS / 1000
    }s and retry, up to ${EMBEDDING_MAX_RETRIES} times per product)`,
  );

  let embedded = 0;
  let failed = 0;

  // Sequential on purpose: the free-tier quota is a shared per-minute budget,
  // so running these concurrently just means more of them collide on the same
  // window. One at a time, spaced out, is what actually respects the limit.
  for (const prod of createdProducts) {
    let succeeded = false;

    for (let attempt = 0; attempt <= EMBEDDING_MAX_RETRIES; attempt++) {
      await sleep(EMBEDDING_MIN_INTERVAL_MS);

      try {
        // idempotencyKeys.id is varchar(40); prod.id ("prod_" + 32 hex chars)
        // is already 37 chars, so it must be used as-is — any prefix pushes
        // it over the column limit and every insert fails with "Value too long".
        await embeddingService.execute(
          new EmbeddingQueueProductUpsertedEventsHandlerCommand(prod.id),
          prod.id,
        );
        succeeded = true;
        break;
      } catch (error) {
        if (!isRateLimitError(error) || attempt === EMBEDDING_MAX_RETRIES) {
          console.error(
            `  ✗ failed to embed ${prod.name}:`,
            (error as Error).message,
          );
          break;
        }

        console.warn(
          `  ⏳ ${prod.name}: rate limited, waiting ${
            EMBEDDING_RATE_LIMIT_COOLDOWN_MS / 1000
          }s before retry ${attempt + 1}/${EMBEDDING_MAX_RETRIES}...`,
        );
        await sleep(EMBEDDING_RATE_LIMIT_COOLDOWN_MS);
      }
    }

    if (succeeded) {
      embedded++;
      console.log(`  ✓ embedded ${prod.name}`);
    } else {
      failed++;
    }
  }

  console.log(`  ✓ ${embedded} products embedded, ${failed} failed`);

  await embeddingScope.dispose();

  /* --------------------------- Cart Items ------------------------------ */
  console.log("→ Inserting cart items");

  const allVariations: Array<{
    id: string;
    productId: string;
    price: number;
    discountPrice: number | null;
    weightInGrams: number;
    availableForSeed: number;
  }> = [];

  for (const prod of createdProducts) {
    for (const v of prod.productEntity.getVariations()) {
      allVariations.push({
        id: v.id.value,
        productId: prod.id,
        price: prod.price,
        discountPrice: prod.discountPrice,
        weightInGrams: v.getWeight().weight,
        availableForSeed: v.getAvailableQty(),
      });
    }
  }

  for (const client of createdClients) {
    const userId = UserId.of(client.id);
    const cart = await cartRepo.findByUserId(userId);

    const itemCount = randomInt(1, 3);
    const pickedVariations = shuffle(allVariations).slice(0, itemCount);

    for (const v of pickedVariations) {
      const qty = randomInt(1, Math.max(1, Math.min(3, v.availableForSeed)));
      cart.addItem(CartItem.create(VariationId.of(v.id), qty));
    }

    await cartRepo.save(cart, dbInstance);
  }

  console.log(`  ✓ Cart items inserted`);

  /* --------------------------- Orders + Order Items --------------------- */
  console.log("→ Inserting orders and order items");

  let ordersInserted = 0;
  let orderItemsInserted = 0;

  for (let i = 0; i < createdClients.length; i++) {
    const client = createdClients[i]!;
    const wilaya = randomFrom(WILAYAS);

    const shippingDetails = ShippingDetails.create(
      DELIVERY_TYPES[i % DELIVERY_TYPES.length]!,
      client.name,
      `0550${randomInt(100000, 999999)}`,
      wilaya.code,
      wilaya.commune,
      `${wilaya.code}000`,
      `${randomInt(1, 200)} Rue de l'Indépendance`,
      false,
      undefined,
      undefined,
      i === 0 ? "Please call before delivery." : undefined,
    );

    const itemCount = randomInt(1, 3);
    const pickedVariations = shuffle(allVariations).slice(0, itemCount);
    const shippingPrice = Money.of(600, "DZD");

    const orderItems: OrderItem[] = [];

    for (const v of pickedVariations) {
      const unitPrice = Money.of(v.price, "DZD");
      const unitDiscountPrice = v.discountPrice
        ? Money.of(v.discountPrice, "DZD")
        : null;
      const weight = Weight.of(v.weightInGrams, "g");

      orderItems.push(
        OrderItem.create(
          VariationId.of(v.id),
          randomInt(1, 2),
          unitPrice,
          weight,
          unitDiscountPrice,
        ),
      );
      orderItemsInserted++;
    }

    const orderEntity = Order.create(
      UserId.of(client.id),
      shippingDetails,
      orderItems,
      shippingPrice,
      "WORLD_EXPRESS",
    );

    orderEntity.setTrackingNumber(`OV${randomInt(100000, 999999)}`);

    await orderRepo.save(orderEntity, dbInstance);
    ordersInserted++;
  }

  console.log(
    `  ✓ ${ordersInserted} orders and ${orderItemsInserted} order items inserted`,
  );

  /* --------------------------- Ratings ----------------------------------- */
  console.log("→ Inserting ratings");

  for (const client of createdClients) {
    const userId = UserId.of(client.id);
    const ratedProducts = shuffle(createdProducts).slice(
      0,
      randomInt(1, Math.min(2, createdProducts.length)),
    );

    for (const prod of ratedProducts) {
      const ratingEntity = Rating.create(
        userId,
        ProductId.of(prod.id),
        randomInt(3, 5),
        randomFrom(REVIEW_COMMENTS),
      );

      if (Math.random() > 0.3) {
        ratingEntity.approve();
      }

      await ratingRepo.save(ratingEntity, dbInstance);
    }
  }

  console.log(`  ✓ Ratings inserted`);

  console.log("🎉 Seed completed successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
