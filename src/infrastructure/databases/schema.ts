import { relations, type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

type ShippingDetails = {
  delivery_type: "TO_DESK" | "TO_HOME";
  full_name: string;
  first_phone: string;
  second_phone: string | null;
  wilaya_code: number;
  commune: string;
  postal_code: string;
  address: string;
  gps_link: string | null;
  client_note: string | null;
  fragile: boolean;
};

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

export const outboxCategoryEnum = pgEnum("outbox_category", [
  "outbox-job",
  "domain-event",
]);

export const outboxStatusEnum = pgEnum("outbox_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
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
  id: varchar("id", { length: 40 }).notNull().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

export const file = pgTable(
  "file",
  {
    id: varchar("id", { length: 40 }).notNull().primaryKey(),
    key: text("key").notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    public_url: varchar("public_url", { length: 2048 }).notNull(),
    product_id: varchar("product_id", { length: 40 })
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    is_main: boolean("is_main").notNull(),
  },
  (t) => [index("file_product_id_idx").on(t.product_id)],
);

export const product = pgTable(
  "product",
  {
    id: varchar("id", { length: 40 }).notNull().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 300 }).notNull().unique(),
    description: varchar("description", { length: 5000 }),
    categoryId: varchar("category_id", { length: 40 }).references(
      () => category.id,
      {
        onDelete: "set null",
      },
    ),
    brand: varchar("brand", { length: 100 }).notNull(),
    material: varchar("material", { length: 100 }).notNull(),
    price: real("price").notNull(),
    discount_price: real("discount_price"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("product_category_id_idx").on(t.categoryId),
    index("product_slug_idx").on(t.slug),
  ],
);

export const variation = pgTable(
  "variation",
  {
    id: varchar("id", { length: 40 }).notNull().primaryKey(),
    product_id: varchar("product_id", { length: 40 })
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    size: sizeEnum("size").notNull(),
    color: colorEnum("color").notNull(),
    total_qty: integer("total_qty").notNull(),
    reserved_qty: integer("reserved_qty").notNull(),
    weight_in_grams: integer("weight_in_grams").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
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
    id: varchar("id", { length: 40 }).notNull().primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    variation_id: varchar("variation_id", { length: 40 })
      .notNull()
      .references(() => variation.id, { onDelete: "cascade" }),
    selected_qty: smallint("selected_qty").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("cart_item_user_id_variation_id_idx").on(
      t.user_id,
      t.variation_id,
    ),
    index("cart_item_user_id_idx").on(t.user_id),
  ],
);

export const order = pgTable(
  "order",
  {
    id: varchar("id", { length: 40 }).notNull().primaryKey(),

    // Lifecycle
    tracking_number: varchar("tracking_number", { length: 32 }).unique(),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    shipping_status: varchar("shipping_status", { length: 50 }),

    // Ownership
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Shipping price snapshot (external rate)
    shipping_price_at_order_time: real(
      "shipping_price_at_order_time",
    ).notNull(),

    selected_shipping_provider: shippingProviderEnum(
      "selected_shipping_provider",
    ).notNull(),

    // Address snapshot
    shipping_details: jsonb("shipping_details")
      .$type<ShippingDetails>()
      .notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("order_user_id_idx").on(t.user_id),
    index("order_status_idx").on(t.status),
    index("order_created_at_idx").on(t.created_at),
  ],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: varchar("id", { length: 40 }).notNull().primaryKey(),
    orderId: varchar("order_id", { length: 40 })
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    variation_id: varchar("variation_id", { length: 40 })
      .notNull()
      .references(() => variation.id, { onDelete: "restrict" }),
    qty: smallint("qty").notNull(),
    unit_price_at_order_time: real("unit_price_at_order_time").notNull(),
    unit_discount_price_at_order_time: real(
      "unit_discount_price_at_order_time",
    ),
    weight_at_order_time: real("weight_at_order_time").notNull(),
  },
  (t) => [index("order_item_order_id_idx").on(t.orderId)],
);

export const rating = pgTable(
  "rating",
  {
    user_id: varchar("user_id", { length: 40 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    product_id: varchar("product_id", { length: 40 })
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    comment: varchar("comment", { length: 1000 }),
    is_approved: boolean("is_approved").notNull().default(false),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.user_id, t.product_id] }),
    index("rating_product_id_idx").on(t.product_id),
    index("rating_user_id_idx").on(t.user_id),
    index("rating_is_approved_idx").on(t.is_approved),
  ],
);

export const outbox = pgTable(
  "outbox",
  {
    id: varchar("id", { length: 40 }).notNull().primaryKey(),
    category: outboxCategoryEnum("category").notNull(),
    // event_type could be like: "order.created" in case of a "domain-event" category
    // event_type could be like: "create_order_in_shipping_api" in case of a "outbox-job" category
    event_type: varchar("event_type", { length: 100 }).notNull(),
    // Optional but useful to query all domain events of a specific aggregate ordered by created_at for debugging.
    aggregate_id: varchar("aggregate_id", { length: 40 }),
    payload: jsonb("payload").notNull(),
    status: outboxStatusEnum("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processed_at: timestamp("processed_at", { withTimezone: true }),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Critical: each worker polls its own slice efficiently
    index("outbox_category_status_scheduled_idx").on(
      t.category,
      t.status,
      t.scheduledAt,
    ),
    index("outbox_aggregate_id_idx").on(t.aggregate_id),
    index("outbox_event_type_idx").on(t.event_type),
  ],
);

export const idempotencyKeys = pgTable("idempotency_keys", {
  id: varchar("id", { length: 40 }).primaryKey(), // Maps directly to BullMQ jobId / Outbox ID
  handler_name: varchar("handler_name", { length: 100 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

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
  user: one(user, { fields: [cartItem.user_id], references: [user.id] }),
  variation: one(variation, {
    fields: [cartItem.variation_id],
    references: [variation.id],
  }),
}));

export const orderRelations = relations(order, ({ one, many }) => ({
  order_items: many(orderItem),

  user: one(user, { fields: [order.user_id], references: [user.id] }),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  variation: one(variation, {
    fields: [orderItem.variation_id],
    references: [variation.id],
  }),
  order: one(order, { fields: [orderItem.orderId], references: [order.id] }),
}));

export const ratingRelations = relations(rating, ({ one }) => ({
  user: one(user, { fields: [rating.user_id], references: [user.id] }),
  product: one(product, {
    fields: [rating.product_id],
    references: [product.id],
  }),
}));

export type DrizzleOrderSelect = InferSelectModel<typeof order>;

export type DrizzleOrderItemSelect = InferSelectModel<typeof orderItem>;

export type DrizzleCategorySelect = InferSelectModel<typeof category>;

export type DrizzleProductSelect = InferSelectModel<typeof product>;

export type DrizzleVariationSelect = InferSelectModel<typeof variation>;

export type DrizzleFileSelect = InferSelectModel<typeof file>;
