import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["CLIENT", "ADMIN"]);
export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "PRE_TRANSIT",
  "SHIPPING",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
  "SUSPENDED",
]);
export const deliveryTypeEnum = pgEnum("delivery_type", ["TO_DESK", "TO_HOME"]);
export const sizeEnum = pgEnum("size", [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "EU_36",
  "EU_37",
  "EU_38",
  "EU_39",
  "EU_40",
  "EU_41",
  "EU_42",
  "EU_43",
]);
export const colorEnum = pgEnum("color", [
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
]);
export const shippingProviderEnum = pgEnum("shipping_provider", [
  "WORLD_EXPRESS",
]);

export const user = pgTable(
  "user",
  {
    id: text("id").notNull().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull(),
    image: text("image"),
    role: roleEnum("role").notNull().default("CLIENT"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
  },
  (t) => [
    uniqueIndex("user_email_idx").on(t.email),
    index("user_banned_idx").on(t.banned),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").notNull().primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (t) => [
    uniqueIndex("session_token_idx").on(t.token),
    index("session_user_id_idx").on(t.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").notNull().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").notNull().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const category = pgTable("category", {
  id: uuid("id")
    .notNull()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

export const file = pgTable(
  "file",
  {
    key: text("key").notNull().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    public_url: varchar("public_url", { length: 2048 }).notNull(),
    color: varchar("color", { length: 100 }),
    product_id: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    is_main: boolean("is_main").notNull(),
  },
  (t) => [index("file_product_id_idx").on(t.product_id)],
);

export const product = pgTable(
  "product",
  {
    id: uuid("id")
      .notNull()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 200 }).notNull(),
    description: varchar("description", { length: 5000 }),
    categoryId: uuid("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    brand: varchar("brand", { length: 100 }).notNull(),
    material: varchar("material", { length: 100 }).notNull(),
    average_rating: real("average_rating").notNull().default(4),
    price: real("price").notNull(),
    discount_price: real("discount_price"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("product_category_id_idx").on(t.categoryId)],
);

export const variation = pgTable(
  "variation",
  {
    id: uuid("id")
      .notNull()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    product_id: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    size: sizeEnum("size").notNull(),
    color: colorEnum("color").notNull(),
    total_qty: integer("total_qty").notNull(),
    reserved_qty: integer("reserved_qty").notNull(),
    available_qty: integer("available_qty").notNull(),
    weight_in_grams: integer("weight_in_grams").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("variation_product_id_color_size_idx").on(
      t.product_id,
      t.color,
      t.size,
    ),
    index("variation_product_id_idx").on(t.product_id),
    index("variation_color_idx").on(t.color),
    index("variation_size_idx").on(t.size),
  ],
);

export const cartItem = pgTable(
  "cart_item",
  {
    id: uuid("id")
      .notNull()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    variation_id: uuid("variation_id")
      .notNull()
      .references(() => variation.id, { onDelete: "cascade" }),
    selected_qty: smallint("selected_qty").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("cart_item_user_id_variation_id_idx").on(
      t.userId,
      t.variation_id,
    ),
    index("cart_item_user_id_idx").on(t.userId),
  ],
);

export const shippingDetails = pgTable("shipping_details", {
  id: uuid("id")
    .notNull()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  full_name: varchar("full_name", { length: 100 }).notNull(),
  first_phone: varchar("first_phone", { length: 20 }).notNull(),
  second_phone: varchar("second_phone", { length: 20 }),
  code_wilaya: smallint("code_wilaya").notNull(),
  commune: varchar("commune", { length: 100 }).notNull(),
  code_postal: varchar("code_postal", { length: 10 }).notNull(),
  address: varchar("address", { length: 300 }).notNull(),
  gps_link: varchar("gps_link", { length: 2048 }),
  client_note: varchar("client_note", { length: 500 }),
  delivery_type: deliveryTypeEnum("delivery_type").notNull(),
  fragile: boolean("fragile").notNull(),
});

export const order = pgTable(
  "order",
  {
    id: uuid("id")
      .notNull()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tracking_number: varchar("tracking_number", { length: 32 }).unique(),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    shipping_status: varchar("shipping_status", { length: 50 }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    total_order_price: real("total_order_price").notNull(),
    total_products_price: real("total_products_price").notNull(),
    shipping_price_at_order_time: real(
      "shipping_price_at_order_time",
    ).notNull(),
    selected_shipping_provider: shippingProviderEnum(
      "selected_shipping_provider",
    ).notNull(),
    total_weight_in_kg: real("total_weight_in_kg").notNull(),
    shipping_details_id: uuid("shipping_details_id")
      .notNull()
      .references(() => shippingDetails.id, { onDelete: "cascade" })
      .unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("order_user_id_idx").on(t.userId),
    index("order_status_idx").on(t.status),
    index("order_created_at_idx").on(t.createdAt),
  ],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: uuid("id")
      .notNull()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    variation_id: uuid("variation_id")
      .notNull()
      .references(() => variation.id, { onDelete: "cascade" }),
    qty: smallint("qty").notNull(),
    unit_price_at_order_time: real("unit_price_at_order_time").notNull(),
  },
  (t) => [index("order_item_order_id_idx").on(t.orderId)],
);

export const rating = pgTable(
  "rating",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    product_id: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    comment: varchar("comment", { length: 1000 }),
    isApproved: boolean("is_approved").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.product_id] }),
    index("rating_product_id_idx").on(t.product_id),
    index("rating_user_id_idx").on(t.userId),
    index("rating_is_approved_idx").on(t.isApproved),
  ],
);

// Relations

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  cart_items: many(cartItem),
  orders: many(order),
  ratings: many(rating),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  products: many(product),
}));

export const fileRelations = relations(file, ({ one }) => ({
  product: one(product, {
    fields: [file.product_id],
    references: [product.id],
  }),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  category: one(category, {
    fields: [product.categoryId],
    references: [category.id],
  }),
  images: many(file),
  variations: many(variation),
  ratings: many(rating),
}));

export const variationRelations = relations(variation, ({ one, many }) => ({
  cart_items: many(cartItem),
  order_items: many(orderItem),
  product: one(product, {
    fields: [variation.product_id],
    references: [product.id],
  }),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  user: one(user, { fields: [cartItem.userId], references: [user.id] }),
  variation: one(variation, {
    fields: [cartItem.variation_id],
    references: [variation.id],
  }),
}));

export const shippingDetailsRelations = relations(
  shippingDetails,
  ({ one }) => ({
    order: one(order),
  }),
);

export const orderRelations = relations(order, ({ one, many }) => ({
  order_items: many(orderItem),
  shipping_details: one(shippingDetails, {
    fields: [order.shipping_details_id],
    references: [shippingDetails.id],
  }),
  user: one(user, { fields: [order.userId], references: [user.id] }),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  variation: one(variation, {
    fields: [orderItem.variation_id],
    references: [variation.id],
  }),
  order: one(order, { fields: [orderItem.orderId], references: [order.id] }),
}));

export const ratingRelations = relations(rating, ({ one }) => ({
  user: one(user, { fields: [rating.userId], references: [user.id] }),
  product: one(product, {
    fields: [rating.product_id],
    references: [product.id],
  }),
}));
