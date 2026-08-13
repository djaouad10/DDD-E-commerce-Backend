import z from "zod";

export const getApprovedRatingsOfProductParamsSchema = z.object({
  productId: z.string(),
});

export const getApprovedRatingsOfProductSearchParamsSchema = z.object({
  limit: z.coerce.number().min(1).optional(),
  cursor: z
    .object({
      createdAt: z.iso.datetime().pipe(z.coerce.date()),
      userId: z.string(),
    })
    .optional(),
});

export const getPendingRatingsOfProductParamsSchema = z.object({
  productId: z.string(),
});

export const getPendingRatingsOfProductSearchParamsSchema = z.object({
  limit: z.coerce.number().min(1).optional(),
  cursor: z
    .object({
      createdAt: z.iso.datetime().pipe(z.coerce.date()),
      userId: z.string(),
    })
    .optional(),
});

export const getRatingsOfClientParamsSchema = z.object({
  clientId: z.string(),
});

export const getRatingsOfClientSearchParamsSchema = z.object({
  limit: z.coerce.number().min(1).optional(),
  cursor: z
    .object({
      createdAt: z.iso.datetime().pipe(z.coerce.date()),
      productId: z.string(),
    })
    .optional(),
});

export const didIRateProductParamsSchema = z.object({
  productId: z.string(),
});
