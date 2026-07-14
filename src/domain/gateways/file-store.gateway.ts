// parameters of the gateway methods should use domain entities and value objects
// return types of the gateway methods should use domain entities and value objects

// to do: make this a domain value object
export type UploadInstructions = {
  url: string; // where the client PUTs/POSTs the file
  publicUrl: string; // where the file will be readable after upload
  method?: "PUT" | "POST"; // default depends on provider
  fields?: Record<string, string>; // extra form fields (S3 POST policy, Cloudinary signature, etc.)
  headers?: Record<string, string>; // required headers for the upload request
};

export type FileStoreGateway = {
  getPublicUrl: (key: string) => Promise<string>;
  getReadUrl: (key: string, expiresInSeconds?: number) => Promise<string>; // for private files
  delete: (key: string) => Promise<void>;
  deleteMany: (keys: string[]) => Promise<void>;

  prepareUpload: (params: {
    key: string;
    contentType?: string;
  }) => Promise<UploadInstructions>;
};
