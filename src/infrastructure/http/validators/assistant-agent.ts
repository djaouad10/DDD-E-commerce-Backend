import z from "zod";

export const assistantAgentChatBodySchema = z.object({
  query: z.string().trim().min(1).max(2000),
  conversationId: z.string().trim().min(1).max(40).optional(),
});
