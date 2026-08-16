import { ShippingProvider } from "#/domain/entities/order.js";
import z from "zod";

export const getShippingWilayasSearchParamsSchema = z.object({
  provider: z.enum(ShippingProvider),
});

export const getCommunesOfWilayaParamsSchema = z.object({
  wilayaCode: z.coerce.number(),
});

export const getCommunesOfWilayaSearchParamsSchema = z.object({
  provider: z.enum(ShippingProvider),
});

export const getDeliveryFeesOfWilayaParamsSchema = z.object({
  wilayaCode: z.coerce.number(),
});

export const getDeliveryFeesOfWilayaSearchParamsSchema = z.object({
  provider: z.enum(ShippingProvider),
});

export const getShippingLabelParamsSchema = z.object({
  tracking: z.string(),
});

export const getShippingLabelSearchParamsSchema = z.object({
  provider: z.enum(ShippingProvider),
});
