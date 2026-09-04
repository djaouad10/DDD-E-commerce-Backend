import z from "zod";

export const updateCartItemBodySchema = z.object({
  newQty: z.number().min(1).max(100),
});

export const updateCartItemParamsSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export const deleteCartItemParamsSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export const addItemToCartBodySchema = z.object({
  variationId: z.string().trim().min(1).max(100),
  qty: z.number().min(1).max(100),
});
