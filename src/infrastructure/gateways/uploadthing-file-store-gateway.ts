import type { FileStoreGateway } from "#/domain/gateways/file-store.gateway.js";
import { GatewayError } from "#/shared/errors/domain-error.js";
import { handleUploadThingErrors } from "#/shared/errors/handle-uploadthing-errors.js";
import { createLogger } from "#/shared/logging/logger.js";
import { UTApi } from "uploadthing/server";

export class UploadthingFileStoreGateway implements FileStoreGateway {
  private logger = createLogger("UploadthingFileStoreGateway");

  constructor(private utApi: UTApi) {}

  async delete(key: string): Promise<void> {
    this.logger.debug(`delete called`, { key });
    try {
      const res = await this.utApi.deleteFiles(key);

      if (!res.success)
        throw new GatewayError("UploadthingFileStoreGateway", undefined);

      this.logger.debug(`delete completed`, { key });
    } catch (error) {
      this.logger.error(`delete failed`, error as Error, { key });

      handleUploadThingErrors(error, "UploadthingFileStoreGateway.delete");
    }
  }
}
