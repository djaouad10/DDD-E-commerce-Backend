import z from "zod";

export const idSchema = z.string().trim().min(1).max(100);

export const imageKeySchema = z.string().trim().min(1).max(100);

export const nameSchema = z.string().trim().min(1).max(200);

export const isoDateStringSchema = z.iso.datetime().pipe(z.coerce.date());

export const limitStringSchema = z.coerce.number().min(1).max(500);

export const strictlyPositiveNumberStringSchema = z.coerce.number().positive();

export const nonNegativeNumberStringSchema = z.coerce.number().nonnegative();

export const descriptionSchema = z.string().trim().min(1).max(3000);

export const brandSchema = z.string().trim().min(1).max(100);

export const materialSchema = z.string().trim().min(1).max(100);
