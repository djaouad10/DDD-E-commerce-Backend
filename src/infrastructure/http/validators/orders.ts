import { OrderStatus } from "#/domain/entities/order.js";
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
