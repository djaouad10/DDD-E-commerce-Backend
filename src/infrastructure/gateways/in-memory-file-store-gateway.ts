import type { FileStoreGateway } from "#/domain/gateways/file-store.gateway.js";

export class InMemoryFileStoreGateway implements FileStoreGateway {
  async delete(): Promise<void> {}

  async deleteMany(): Promise<void> {}

  async getPrivateFileReadUrl(): Promise<string> {
    return "https://example.com/file/private/blablabla";
  }

  getPublicFileUrl(): string {
    return "https://example.com/file/public/blablabla";
  }
}
