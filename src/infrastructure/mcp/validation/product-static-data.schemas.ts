import { Color, Size } from "#/domain/entities/product.js";
import { Currency } from "#/domain/value-objects/money.js";
import z from "zod";

export const getProductFullDetailsInputSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, "Product ID is required.")
    .describe("ID of the product to retrieve."),
});

const moneySnapshotSchema = z.object({
  amount: z.number(),
  currency: z.enum(Currency),
});

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
});

const imageSchema = z.object({
  name: z.string(),
  url: z.string(),
});

export const getProductFullDetailsOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  brand: z.string(),
  material: z.string(),
  price: moneySnapshotSchema,
  discountedPrice: moneySnapshotSchema.nullable(),
  category: categorySchema.nullable(),
  averageRating: z.number().nullable(),
  mainImage: imageSchema.nullable(),
  images: z.array(imageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  variations: z.array(
    z.object({
      id: z.string(),
      size: z.enum(Size),
      color: z.enum(Color),
      availableQty: z.number(),
      weightInGrams: z.number(),
    }),
  ),
});
