import z from "zod";
import { idSchema, nameSchema } from "./shared.js";

export const createCategoryBodySchema = z.object({
  name: nameSchema,
});

export const updateCategoryBodySchema = z.object({
  name: nameSchema,
});

export const updateCategoryParamsSchema = z.object({
  id: idSchema,
});

export const deleteCategoryParamsSchema = z.object({
  id: idSchema,
});
