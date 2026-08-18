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
