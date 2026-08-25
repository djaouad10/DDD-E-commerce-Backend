import { ValidationError } from "#/shared/errors/domain-error.js";
import type z from "zod";

export function validate<Output>(
  schema: z.ZodSchema<Output>,
  data: unknown,
): Output {
  const { data: safeData, error, success } = schema.safeParse(data);

  if (!success) {
    const firstIssue = error.issues[0];
    const issuePath = firstIssue?.path.join(".") ?? "unknown";
    const issueMessage = firstIssue?.message ?? "unknown";

    throw new ValidationError(issuePath, issueMessage);
  }

  return safeData;
}
