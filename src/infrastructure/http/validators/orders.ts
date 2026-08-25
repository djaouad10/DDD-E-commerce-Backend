import { OrderStatus, ShippingProvider } from "#/domain/entities/order.js";
import { DeliveryType } from "#/domain/value-objects/shipping-details.js";
import z from "zod";

export const getOrdersOfClientSearchParamsSchema = z.object({
  clientId: z.string(),
  limit: z.coerce.number().min(1).optional(),
  status: z.enum(OrderStatus).optional(),
  cursor: z
    .object({
      createdAt: z.iso.datetime().pipe(z.coerce.date()),
      orderId: z.string(),
    })
    .optional(),
});

export const getOrderByTrackingNumberParamsSchema = z.object({
  tracking: z.string(),
});

export const getOrderByIdParamsSchema = z.object({
  id: z.string(),
});

export const getOrdersSearchParamsSchema = z.object({
  limit: z.coerce.number().min(1).optional(),
  status: z.enum(OrderStatus).optional(),
  cursor: z
    .object({
      createdAt: z.iso.datetime().pipe(z.coerce.date()),
      orderId: z.string(),
    })
    .optional(),
});

const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^(00213|\+213|0)(5|6|7)[0-9]{8}$/, "invalid algerian phone number");

export const createOrderBodySchema = z.object({
  idempotencyKey: z.uuid(),
  providedShippingPrice: z.coerce.number().positive().max(1000000),
  selectedShippingProvider: z.enum(ShippingProvider),
  shippingDetails: z.object({
    fullName: z.string().trim(),
    firstPhone: phoneNumberSchema,
    secondPhone: phoneNumberSchema.optional(),
    wilayaCode: z.number().min(1).max(69),
    commune: z.string().trim(),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{3,5}$/, "invalid postal code"),

    address: z.string().trim(),
    gpsLink: z.url().optional(),
    clientNote: z.string().trim().optional(),
    deliveryType: z.enum(DeliveryType),
    fragile: z.boolean(),
  }),
});

export const cancelOrderParamsSchema = z.object({
  id: z.string(),
});

export const confirmOrderParamsSchema = z.object({
  id: z.string(),
});

export const shipOrderParamsSchema = z.object({
  id: z.string(),
});
