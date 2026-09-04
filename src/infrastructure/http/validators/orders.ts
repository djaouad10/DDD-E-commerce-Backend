import { OrderStatus, ShippingProvider } from "#/domain/entities/order.js";
import { DeliveryType } from "#/domain/value-objects/shipping-details.js";
import z from "zod";
import { idSchema, isoDateStringSchema, limitStringSchema, nameSchema, strictlyPositiveNumberStringSchema } from "./shared.js";

export const getOrdersOfClientSearchParamsSchema = z.object({
  clientId: idSchema,
  limit: limitStringSchema.optional(),
  status: z.enum(OrderStatus).optional(),
  cursor: z
    .object({
      createdAt: isoDateStringSchema,
      orderId: idSchema,
    })
    .optional(),
});

export const getOrderByTrackingNumberParamsSchema = z.object({
  tracking: z.string().trim().min(1).max(100),
});

export const getOrderByIdParamsSchema = z.object({
  id: idSchema,
});

export const getOrdersSearchParamsSchema = z.object({
  limit: limitStringSchema.optional(),
  status: z.enum(OrderStatus).optional(),
  cursor: z
    .object({
      createdAt: isoDateStringSchema,
      orderId: idSchema,
    })
    .optional(),
});

const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^(00213|\+213|0)(5|6|7)[0-9]{8}$/, "invalid algerian phone number");

export const createOrderBodySchema = z.object({
  idempotencyKey: z.uuid(),
  providedShippingPrice: strictlyPositiveNumberStringSchema.max(1000000),
  selectedShippingProvider: z.enum(ShippingProvider),
  shippingDetails: z.object({
    fullName: nameSchema,
    firstPhone: phoneNumberSchema,
    secondPhone: phoneNumberSchema.optional(),
    wilayaCode: z.number().min(1).max(69),
    commune: z.string().trim().min(1).max(100),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{3,5}$/, "invalid postal code"),

    address: z.string().trim().min(1).max(100),
    gpsLink: z.url().optional(),
    clientNote: z.string().trim().min(1).max(500).optional(),
    deliveryType: z.enum(DeliveryType),
    fragile: z.boolean(),
  }),
});

export const cancelOrderParamsSchema = z.object({
  id: idSchema,
});

export const confirmOrderParamsSchema = z.object({
  id: idSchema,
});

export const shipOrderParamsSchema = z.object({
  id: idSchema,
});

export const updateShippingDetailsParamsSchema = z.object({
  id: idSchema,
});

export const updateShippingDetailsBodySchema = z.object({
  clientName: nameSchema,
  phone: phoneNumberSchema,
  phone2: phoneNumberSchema.optional().nullable(),
  address: z.string().trim().min(1).max(100),
  note: z.string().trim().min(1).max(500).optional().nullable(),
  isFragile: z.boolean(),
  gpsLink: z.url().optional().nullable(),
});
