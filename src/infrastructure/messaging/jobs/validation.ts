import { OutboxAction } from "#/application/repositories/outbox.repository.js";
import { ShippingProvider } from "#/domain/entities/order.js";
import z from "zod";

export const outboxJobPayloadsSchemas = z.object({
  [OutboxAction.CREATE_ORDER_IN_SHIPPING_API]: z.object({
    orderId: z.string(),
  }),
  [OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API]: z.object({
    trackingNumber: z.string(),
  }),
  [OutboxAction.UPDATE_ORDER_IN_SHIPPING_API]: z.object({
    orderId: z.string(),
  }),
  [OutboxAction.DELETE_ORDER_IN_SHIPPING_API]: z.object({
    trackingNumber: z.string(),
    shippingProvider: z.enum(ShippingProvider),
  }),
});

export type OutboxJobPayloadType<T extends OutboxAction> = z.infer<typeof outboxJobPayloadsSchemas>[T];