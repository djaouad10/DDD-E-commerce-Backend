import z from "zod";
import {
  idSchema,
  isoDateStringSchema,
  limitStringSchema,
  nonNegativeNumberStringSchema,
} from "./shared.js";

export const getApprovedRatingsOfProductParamsSchema = z.object({
  productId: idSchema,
});

export const getApprovedRatingsOfProductSearchParamsSchema = z.object({
  limit: limitStringSchema.optional(),
  cursor: z
    .object({
      createdAt: isoDateStringSchema,
      userId: idSchema,
    })
    .optional(),
});

export const getPendingRatingsOfProductParamsSchema = z.object({
  productId: idSchema,
});

export const getPendingRatingsOfProductSearchParamsSchema = z.object({
  limit: limitStringSchema.optional(),
  cursor: z
    .object({
      createdAt: isoDateStringSchema,
      userId: idSchema,
    })
    .optional(),
});

export const getRatingsOfClientParamsSchema = z.object({
  clientId: idSchema,
});

export const getRatingsOfClientSearchParamsSchema = z.object({
  limit: limitStringSchema.optional(),
  cursor: z
    .object({
      createdAt: isoDateStringSchema,
      productId: idSchema,
    })
    .optional(),
});

export const didIRateProductParamsSchema = z.object({
  productId: idSchema,
});

export const createRatingParamsSchema = z.object({
  productId: idSchema,
});

export const createRatingBodySchema = z.object({
  rating: nonNegativeNumberStringSchema.max(5),
  comment: z.string().trim().min(1).max(1000).nullable(),
});

export const deleteRatingParamsSchema = z.object({
  productId: idSchema,
});

export const deleteRatingSearchParamsSchema = z.object({
  clientId: idSchema,
});

export const approveRatingParamsSchema = z.object({
  productId: idSchema,
});

export const approveRatingSearchParamsSchema = z.object({
  clientId: idSchema,
});
