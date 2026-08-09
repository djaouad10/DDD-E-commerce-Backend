import z from "zod";

export const updateCartItemBodySchema = z.object({
  newQty: z.number().min(1),
});

export const updateCartItemParamsSchema = z.object({
  id: z.string(),
});

export const deleteCartItemParamsSchema = z.object({
  id: z.string(),
});

export const addItemToCartBodySchema = z.object({
  variationId: z.string(),
  qty: z.number().min(1),
});
