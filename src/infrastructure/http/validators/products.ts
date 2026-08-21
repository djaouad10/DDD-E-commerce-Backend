import { Color, Size } from "#/domain/entities/product.js";
import z from "zod";

export const updateProductMainImageParamsSchema = z.object({
  id: z.string(),
});

export const updateProductMainImageBodySchema = z.object({
  key: z.string(),
  name: z.string(),
  publicUrl: z.url(),
});

export const deleteProductImageParamsSchema = z.object({
  id: z.string(),
  key: z.string(),
});

export const getProductVariationsParamsSchema = z.object({
  id: z.string(),
});

export const getProductVariationsWithCartFlagParamsSchema = z.object({
  id: z.string(),
});

export const getProductsSearchParamsSchema = z.object({
  limit: z.coerce.number().min(1).optional(),
  categoryId: z.string().optional(),
  max_price: z.coerce.number().optional(),
  min_price: z.coerce.number().optional(),
  cursor: z
    .object({
      createdAt: z.iso.datetime().pipe(z.coerce.date()),
      productId: z.string(),
    })
    .optional(),
});

export const getLowStockProductsSearchParamsSchema = z.object({
  limit: z.coerce.number().min(1).optional(),
  minStock: z.coerce.number().optional(),
  cursor: z
    .object({
      createdAt: z.iso.datetime().pipe(z.coerce.date()),
      productId: z.string(),
    })
    .optional(),
});

export const getProductStaticDataParamsSchema = z.object({
  id: z.string(),
});

export const getProductUpdateDataParamsSchema = z.object({
  id: z.string(),
});

export const createProductImageParamsSchema = z.object({
  id: z.string(),
});

export const createProductImageBodySchema = z.object({
  key: z.string(),
  name: z.string(),
  public_url: z.url(),
});

export const updateVariationOfProductParamsSchema = z.object({
  productId: z.string(),
  variationId: z.string(),
});

export const updateVariationOfProductBodySchema = z.object({
  newTotalQty: z.coerce.number().nonnegative().optional(),
  newWeightInGrams: z.coerce.number().positive().optional(),
});

export const createVariationOfProductParamsSchema = z.object({
  id: z.string(),
});

export const createVariationOfProductBodySchema = z.object({
  size: z.enum(Size),
  color: z.enum(Color),
  totalQty: z.coerce.number().nonnegative(),
  weightInGrams: z.coerce.number().positive(),
});

export const createProductBodySchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  price: z.coerce.number().positive(),
  discountPrice: z.coerce.number().positive().nullable(),
  categoryId: z.string().nullable(),
  brand: z.string(),
  material: z.string(),
  mainImage: z.object({
    name: z.string(),
    publicUrl: z.string(),
    key: z.string(),
  }),
  variations: z.array(
    z.object({
      size: z.enum(Size),
      color: z.enum(Color),
      totalQty: z.coerce.number().nonnegative(),
      weightInGrams: z.coerce.number().positive(),
    }),
  ),
});

export const updateProductParamsSchema = z.object({
  id: z.string(),
});

export const updateProductBodySchema = z.object({
  price: z.coerce.number().positive().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  brand: z.string().optional(),
  material: z.string().optional(),
  discountPrice: z.coerce.number().positive().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});

export const deleteVariationOfProductParamsSchema = z.object({
  productId: z.string(),
  variationId: z.string(),
});
