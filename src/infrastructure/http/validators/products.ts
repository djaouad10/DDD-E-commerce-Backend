import { Color, Size } from "#/domain/entities/product.js";
import z from "zod";
import {
  brandSchema,
  descriptionSchema,
  idSchema,
  imageKeySchema,
  isoDateStringSchema,
  limitStringSchema,
  materialSchema,
  nameSchema,
  nonNegativeNumberStringSchema,
  strictlyPositiveNumberStringSchema,
} from "./shared.js";

export const updateProductMainImageParamsSchema = z.object({
  id: idSchema,
});

export const updateProductMainImageBodySchema = z.object({
  key: imageKeySchema,
  name: idSchema,
  publicUrl: z.url(),
});

export const deleteProductImageParamsSchema = z.object({
  id: idSchema,
  key: imageKeySchema,
});

export const getProductVariationsParamsSchema = z.object({
  id: idSchema,
});

export const getProductVariationsWithCartFlagParamsSchema = z.object({
  id: idSchema,
});

export const getProductsSearchParamsSchema = z.object({
  limit: limitStringSchema.optional(),
  categoryId: idSchema.optional(),
  max_price: strictlyPositiveNumberStringSchema.optional(),
  min_price: nonNegativeNumberStringSchema.optional(),
  cursor: z
    .object({
      createdAt: isoDateStringSchema,
      productId: idSchema,
    })
    .optional(),
});

export const getLowStockProductsSearchParamsSchema = z.object({
  limit: limitStringSchema.optional(),
  minStock: nonNegativeNumberStringSchema.optional(),
  cursor: z
    .object({
      createdAt: isoDateStringSchema,
      productId: idSchema,
    })
    .optional(),
});

export const getProductStaticDataParamsSchema = z.object({
  id: idSchema,
});

export const getProductUpdateDataParamsSchema = z.object({
  id: idSchema,
});

export const createProductImageParamsSchema = z.object({
  id: idSchema,
});

export const createProductImageBodySchema = z.object({
  key: imageKeySchema,
  name: nameSchema,
  public_url: z.url(),
});

export const updateVariationOfProductParamsSchema = z.object({
  productId: idSchema,
  variationId: idSchema,
});

export const updateVariationOfProductBodySchema = z.object({
  newTotalQty: nonNegativeNumberStringSchema.optional(),
  newWeightInGrams: strictlyPositiveNumberStringSchema.optional(),
});

export const createVariationOfProductParamsSchema = z.object({
  id: idSchema,
});

export const createVariationOfProductBodySchema = z.object({
  size: z.enum(Size),
  color: z.enum(Color),
  totalQty: nonNegativeNumberStringSchema,
  weightInGrams: strictlyPositiveNumberStringSchema,
});

export const createProductBodySchema = z.object({
  name: nameSchema,
  description: descriptionSchema.nullable(),
  price: strictlyPositiveNumberStringSchema,
  discountPrice: strictlyPositiveNumberStringSchema.nullable(),
  categoryId: idSchema.nullable(),
  brand: brandSchema,
  material: materialSchema,
  mainImage: z.object({
    name: imageKeySchema,
    publicUrl: z.url(),
    key: imageKeySchema,
  }),
  variations: z.array(
    z.object({
      size: z.enum(Size),
      color: z.enum(Color),
      totalQty: nonNegativeNumberStringSchema,
      weightInGrams: strictlyPositiveNumberStringSchema,
    }),
  ),
});

export const updateProductParamsSchema = z.object({
  id: idSchema,
});

export const updateProductBodySchema = z.object({
  price: strictlyPositiveNumberStringSchema.optional(),
  name: nameSchema.optional(),
  description: descriptionSchema.nullable().optional(),
  brand: brandSchema.optional(),
  material: materialSchema.optional(),
  discountPrice: strictlyPositiveNumberStringSchema.nullable().optional(),
  categoryId: idSchema.nullable().optional(),
});

export const deleteVariationOfProductParamsSchema = z.object({
  productId: idSchema,
  variationId: idSchema,
});

export const deleteProductParamsSchema = z.object({
  id: idSchema,
});
