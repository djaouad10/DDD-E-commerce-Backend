import z from "zod";

export const getClientProfileSearchParamsSchema = z.object({
  id: z.string(),
});
