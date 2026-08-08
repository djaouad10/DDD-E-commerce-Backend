import z from "zod";

export const createCategoryBodySchema = z.object({
  name: z.string().min(3),
});
