import type { FileStoreGateway } from "#/domain/gateways/file-store.gateway.js";
import { GatewayError } from "#/shared/errors/domain-error.js";
import { handleUploadThingErrors } from "#/shared/errors/handle-uploadthing-errors.js";
import { createLogger } from "#/shared/logging/logger.js";
import { UTApi } from "uploadthing/server";
import { env } from "../config/env.js";

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

  async deleteMany(keys: string[]): Promise<void> {
    this.logger.debug(`deleteMany called`, { keys });
    try {
      const res = await this.utApi.deleteFiles(keys);

      if (!res.success)
        throw new GatewayError("UploadthingFileStoreGateway", undefined);

      if (res.deletedCount !== keys.length) {
        this.logger.warn(`deleteMany failed to delete all files`, { keys });
      }

      this.logger.debug(`delete completed`, { keys });
    } catch (error) {
      this.logger.error(`delete failed`, error as Error, { keys });

      handleUploadThingErrors(error, "UploadthingFileStoreGateway.deleteMany");
    }
  }

  getPublicFileUrl(key: string): string {
    this.logger.debug(`getPublicUrl called`, { key });

    const url = `https://${env.UPLOADTHING_APP_ID}.ufs.sh/f/${key}`;

    this.logger.debug(`getPublicUrl completed`, { key, url });

    return url;
  }
}
