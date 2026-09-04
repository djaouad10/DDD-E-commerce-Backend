import z from "zod";
import { idSchema, strictlyPositiveNumberStringSchema } from "./shared.js";

export const updateCartItemBodySchema = z.object({
  newQty: strictlyPositiveNumberStringSchema.max(100),
});

export const updateCartItemParamsSchema = z.object({
  id: idSchema,
});

export const deleteCartItemParamsSchema = z.object({
  id: idSchema,
});

export const addItemToCartBodySchema = z.object({
  variationId: idSchema,
  qty: strictlyPositiveNumberStringSchema.max(100),
});
