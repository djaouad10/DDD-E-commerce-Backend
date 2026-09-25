import { Color, Size } from "#/domain/entities/product.js";
import { Currency } from "#/domain/value-objects/money.js";
import z from "zod";

export const productSemanticSearchInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "A search query is required.")
    .describe(
      "Natural-language description of the product or shopping intent.",
    ),

  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Maximum number of products to return. Defaults to 5."),

  filters: z
    .object({
      colors: z
        .array(z.enum(Color))
        .optional()
        .describe("Only products with a variation in one of these colors."),

      sizes: z
        .array(z.enum(Size))
        .optional()
        .describe("Only products with a variation in one of these sizes."),

      minPrice: z
        .number()
        .finite()
        .nonnegative()
        .optional()
        .describe("Minimum effective price in DZD, inclusive."),

      maxPrice: z
        .number()
        .finite()
        .nonnegative()
        .optional()
        .describe("Maximum effective price in DZD, inclusive."),

      inStock: z
        .boolean()
        .optional()
        .describe("Whether to restrict results to products in stock."),
    })
    .optional()
    .superRefine((filters, ctx) => {
      if (
        filters?.minPrice !== undefined &&
        filters.maxPrice !== undefined &&
        filters.maxPrice <= filters.minPrice
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["maxPrice"],
          message: "maxPrice must be greater than minPrice.",
        });
      }
    }),
});

const semanticProductHitSchema = z.object({
  productId: z.string(),
  name: z.string(),
  slug: z.string(),
  price: z.number(),
  discountedPrice: z.number().nullable(),
  currency: z.enum(Currency),
  similarityDistance: z.number(),
});

export const productSemanticSearchOutputSchema = z.object({
  products: z.array(semanticProductHitSchema),
});
