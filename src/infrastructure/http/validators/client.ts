import z from "zod";

export const getClientProfileSearchParamsSchema = z.object({
  id: z.string(),
});

export const deleteCartItemParamsSchema = z.object({
  id: z.string(),
});
