import z from "zod";

export const updateCartItemBodySchema = z.object({
  newQty: z.number().min(1),
});

export const updateCartItemParamsSchema = z.object({
  id: z.string(),
});
