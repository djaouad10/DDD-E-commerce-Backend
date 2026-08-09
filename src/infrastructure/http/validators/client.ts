import { UserRole } from "#/domain/entities/user.js";
import z from "zod";

export const getClientProfileSearchParamsSchema = z.object({
  id: z.string(),
});

export const getClientBanStatusParamsSchema = z.object({
  id: z.string(),
});

export const getClientsListSearchParamsSchema = z.object({
  limit: z.coerce.number().min(1),
  role: z.enum(UserRole),
  cursor: z
    .object({
      createdAt: z.iso.datetime().pipe(z.coerce.date()),
      userId: z.string(),
    })
    .optional(),
});
