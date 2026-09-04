import z from "zod";
import { strictlyPositiveNumberStringSchema } from "./shared.js";

export const updateCartItemBodySchema = z.object({
  newQty: z.number().min(1).max(100),
});

export const updateCartItemParamsSchema = z.object({
  id: strictlyPositiveNumberStringSchema.max(100),
});

export const deleteCartItemParamsSchema = z.object({
  id: strictlyPositiveNumberStringSchema.max(100),
});

export const addItemToCartBodySchema = z.object({
  variationId: strictlyPositiveNumberStringSchema.max(100),
  qty: strictlyPositiveNumberStringSchema.max(100),
});
