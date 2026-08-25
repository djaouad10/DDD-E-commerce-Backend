import z from "zod";

export const createCategoryBodySchema = z.object({
  name: z.string().min(3),
});

export const updateCategoryBodySchema = z.object({
  name: z.string().min(3),
});

export const updateCategoryParamsSchema = z.object({
  id: z.string(),
});

export const deleteCategoryParamsSchema = z.object({
  id: z.string(),
});
