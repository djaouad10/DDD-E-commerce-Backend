// parameters of the gateway methods should use domain entities and value objects
// return types of the gateway methods should use domain entities and value objects

export type FileStoreGateway = {
  getPublicFileUrl: (key: string) => string;
  getPrivateFileReadUrl: (
    key: string,
    expiresInSeconds?: number,
  ) => Promise<string>; // for private files
  delete: (key: string) => Promise<void>;
  deleteMany: (keys: string[]) => Promise<void>;

  // presigned URLs are handled by the uploadthing router
};
