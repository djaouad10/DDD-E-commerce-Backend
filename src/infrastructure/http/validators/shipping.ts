import { ShippingProvider } from "#/domain/entities/order.js";
import z from "zod";

export const getShippingWilayasSearchParamsSchema = z.object({
  provider: z.enum(ShippingProvider),
});
