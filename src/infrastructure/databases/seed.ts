import { eq } from "drizzle-orm";

// Import domain entities
import { Category } from "#/domain/entities/category.js";
import { Product } from "#/domain/entities/product.js";
import { Variation } from "#/domain/entities/variation.js";
import { File } from "#/domain/entities/file.js";
import { CartItem } from "#/domain/entities/cart-item.js";
import { Order } from "#/domain/entities/order.js";
import { OrderItem } from "#/domain/entities/order-item.js";
import { Rating } from "#/domain/entities/rating.js";

// Import value objects
import { ProductId } from "#/domain/value-objects/product-id.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { Money } from "#/domain/value-objects/money.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { Slug } from "#/domain/value-objects/slug.js";
import { ShippingDetails } from "#/domain/value-objects/shipping-details.js";
import { Size, Color } from "#/domain/entities/product.js";

// Import repositories and container
import { buildApiContainer } from "#/composition/api-composition.js";
import {
  CATEGORY_REPOSITORY,
  PRODUCT_REPOSITORY,
  ORDER_REPOSITORY,
  RATING_REPOSITORY,
  CART_REPOSITORY,
  DB,
  AUTH,
} from "#/composition/tokens.js";

// Import schema for direct deletes
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

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const IMAGE_URL =
  "https://ihcsn38gr8.ufs.sh/f/SpyYY0hniRCQXH1pv7N7umRYkIJGv1Bzgr93SFe2nMwpxPtZ";

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

  // Build container and get dependencies
  const container = buildApiContainer();
  const dbInstance = container.resolveSingleton(DB);
  const categoryRepo = container.resolveSingleton(CATEGORY_REPOSITORY);
  const productRepo = container.resolveSingleton(PRODUCT_REPOSITORY);
  const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
  const ratingRepo = container.resolveSingleton(RATING_REPOSITORY);
  const cartRepo = container.resolveSingleton(CART_REPOSITORY);
  const auth = await container.resolveSingleton(AUTH);
  /* --------------------------- Clear DB ---------------------------- */
  // order_item -> variation is ON DELETE RESTRICT now, so order_item must
  // be cleared before variation
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
  const categoryIdMap = new Map<string, string>();

  for (const categoryName of CATEGORIES) {
    const categoryEntity = Category.create(categoryName);
    // We need to store the entity for later use
    categoryMap.set(categoryName, categoryEntity);
    categoryIdMap.set(categoryName, categoryEntity.id.value);

    // Save category using repository (will handle transaction)
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

    // Create images (File entities)
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

    // Create variations
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

        // Validate color and size are valid enum values
        const color = colorVal as unknown as Color;
        const size = sizeVal as unknown as Size;

        const variation = Variation.create(
          size,
          color,
          total,
          reserved,
          Weight.of(weight, "g"),
        );
        variations.push(variation);
      }
    }

    // Create product using domain factory
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
      null, // averageRating initially null
    );

    // Save product using repository (will handle transaction)
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

  /* --------------------------- Cart Items ------------------------------ */
  console.log("→ Inserting cart items");

  // We need variations from created products
  const allVariations: Array<{
    id: string;
    productId: string;
    price: number;
    discountPrice: number | null;
    weightInGrams: number;
    availableForSeed: number;
  }> = [];

  for (const prod of createdProducts) {
    const variations = prod.productEntity.getVariations();
    for (const v of variations) {
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
      const cartItemEntity = CartItem.create(VariationId.of(v.id), qty);
      cart.addItem(cartItemEntity);
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
      false, // fragile
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

      const orderItemEntity = OrderItem.create(
        VariationId.of(v.id),
        randomInt(1, 2),
        unitPrice,
        weight,
        unitDiscountPrice,
      );

      orderItems.push(orderItemEntity);
      orderItemsInserted++;
    }

    const orderEntity = Order.create(
      UserId.of(client.id),
      shippingDetails,
      orderItems,
      shippingPrice,
      "WORLD_EXPRESS", // ShippingProvider.WORLD_EXPRESS
    );

    // Set tracking number
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

      // Randomly approve some ratings
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
