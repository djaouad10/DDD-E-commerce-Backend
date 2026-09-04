import { UserRole } from "#/domain/entities/user.js";
import z from "zod";
import {
  idSchema,
  isoDateStringSchema,
  limitStringSchema,
  nameSchema,
} from "./shared.js";

export const getClientProfileSearchParamsSchema = z.object({
  id: idSchema,
});

export const getClientBanStatusParamsSchema = z.object({
  id: idSchema,
});

export const getClientsListSearchParamsSchema = z.object({
  limit: limitStringSchema,
  role: z.enum(UserRole),
  cursor: z
    .object({
      createdAt: isoDateStringSchema,
      userId: idSchema,
    })
    .optional(),
});

export const banClientParamsSchema = z.object({
  id: idSchema,
});

export const banClientBodySchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
  banExpiresInSeconds: z.coerce
    .number()
    .max(60 * 60 * 24 * 365)
    .positive()
    .optional(),
});

export const unbanClientParamsSchema = z.object({
  id: idSchema,
});

export const updateClientProfileBodySchema = z.object({
  name: nameSchema.optional(),
  image: z.url().optional().nullable(),
});
