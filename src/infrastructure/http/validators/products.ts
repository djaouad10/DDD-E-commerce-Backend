import z from "zod";

export const updateProductMainImageParamsSchema = z.object({
  id: z.string(),
});

export const updateProductMainImageBodySchema = z.object({
  key: z.string(),
  name: z.string(),
  publicUrl: z.url(),
});

export const deleteProductImageParamsSchema = z.object({
  id: z.string(),
  key: z.string(),
});
