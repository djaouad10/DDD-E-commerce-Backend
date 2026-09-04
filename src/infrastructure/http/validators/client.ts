import { UserRole } from "#/domain/entities/user.js";
import z from "zod";

export const getClientProfileSearchParamsSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export const getClientBanStatusParamsSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export const getClientsListSearchParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(500),
  role: z.enum(UserRole),
  cursor: z
    .object({
      createdAt: z.iso.datetime().pipe(z.coerce.date()),
      userId: z.string().trim().min(1).max(100),
    })
    .optional(),
});

export const banClientParamsSchema = z.object({
  id: z.string().trim().min(1).max(100),
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
  id: z.string().trim().min(1).max(100),
});

export const updateClientProfileBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  image: z.url().optional().nullable(),
});
