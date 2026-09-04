import z from "zod";

export const createCategoryBodySchema = z.object({
  name: z.string().min(3).max(100),
});

export const updateCategoryBodySchema = z.object({
  name: z.string().min(3).max(100),
});

export const updateCategoryParamsSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export const deleteCategoryParamsSchema = z.object({
  id: z.string().trim().min(1).max(100),
});
