import { createUploadthing, type FileRouter } from "uploadthing/express";
import { UploadThingError } from "uploadthing/server";
import type { Auth } from "../config/auth.js";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes

export function createUploadThingFileRouter(auth: Auth): FileRouter {
  const router = {
    // Define as many FileRoutes as you like, each with a unique routeSlug
    productImage: f({
      image: {
        maxFileSize: "8MB",
        maxFileCount: 1,
      },
    })
      // Set permissions and file types for this FileRoute
      .middleware(async ({ req }) => {
        const authObj = await auth;

        const data = await authObj.api.getSession({ headers: req.headers });

        //   If you throw, the user will not be able to upload
        if (!data?.user || data.user.role !== "ADMIN") {
          throw new UploadThingError("Unauthorized");
        }

        // Whatever is returned here is accessible in client's onUploadComplete as `metadata`
        return { userId: data.user.id };
      })
      .onUploadComplete(async ({ metadata, file }) => {
        // This code RUNS ON YOUR SERVER after upload
        const { ufsUrl: url, name, key, type } = file;

        return { url, name, key, type, metadata };
      }),
  } satisfies FileRouter;

  return router;
}

export type UploadThingFileRouter = ReturnType<
  typeof createUploadThingFileRouter
>;
