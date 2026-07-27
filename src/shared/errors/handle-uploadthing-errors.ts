import { UploadThingError } from "uploadthing/server";
import {
  BadRequestError,
  GatewayError,
  UnauthorizedError,
  ValidationError,
} from "./domain-error.js";

export function handleUploadThingErrors(
  error: unknown,
  context: string,
): never {
  if (error instanceof UploadThingError) {
    switch (error.code) {
      // Client errors → domain validation
      case "TOO_LARGE":
        throw new ValidationError("file", "File exceeds maximum size");
      case "TOO_SMALL":
        throw new ValidationError("file", "File is too small");
      case "TOO_MANY_FILES":
        throw new ValidationError("files", "Too many files uploaded");
      case "KEY_TOO_LONG":
        throw new ValidationError("key", "File key too long");
      case "BAD_REQUEST":
        throw new BadRequestError(error.message, { context });

      // Authorization
      case "FORBIDDEN":
        throw new UnauthorizedError("upload file", "unknown");

      // UploadThing is broken/down → infrastructure problem
      case "UPLOAD_FAILED":
      case "URL_GENERATION_FAILED":
      case "INTERNAL_SERVER_ERROR":
      case "FILE_LIMIT_EXCEEDED":
      default:
        throw new GatewayError("UploadThing", error);
    }
  }

  // Network/fetch errors/other unexpected errors

  throw new GatewayError("UploadThing", error);
}
