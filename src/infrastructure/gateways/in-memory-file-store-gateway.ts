import type { FileStoreGateway } from "#/domain/gateways/file-store.gateway.js";

export class InMemoryFileStoreGateway implements FileStoreGateway {
  async delete(key: string): Promise<void> {}

  async deleteMany(keys: string[]): Promise<void> {}

  async getPrivateFileReadUrl(
    key: string,
    expiresInSeconds?: number,
  ): Promise<string> {
    return "https://example.com/file/private/blablabla";
  }

  getPublicFileUrl(key: string): string {
    return "https://example.com/file/public/blablabla";
  }
}
