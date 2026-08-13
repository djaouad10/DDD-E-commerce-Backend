import { Router } from "express";
import {
  didIRateProductParamsSchema,
  getApprovedRatingsOfProductParamsSchema,
  getApprovedRatingsOfProductSearchParamsSchema,
  getPendingRatingsOfProductParamsSchema,
  getPendingRatingsOfProductSearchParamsSchema,
  getRatingsOfClientParamsSchema,
  getRatingsOfClientSearchParamsSchema,
} from "../validators/ratings.js";
import { validate } from "../utils/validation.js";
import {
  DID_USER_RATE_PRODUCT_SERVICE,
  GET_APPROVED_RATINGS_OF_PRODUCT_SERVICE,
  GET_PENDING_RATINGS_OF_PRODUCT_SERVICE,
  GET_RATINGS_OF_CLIENT_SERVICE,
} from "#/composition/tokens.js";
import { GetApprovedRatingsOfProductQuery } from "#/application/queries/get-approved-ratings-of-product.query.js";
import { GetPendingRatingsOfProductQuery } from "#/application/queries/get-pending-ratings-of-product.query.js";
import { GetRatingsOfClientQuery } from "#/application/queries/get-ratings-of-client.query.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";
import { clientMiddleware } from "../middleware/client-middleware.js";
import { DidUserRateProductQuery } from "#/application/queries/did-user-rate-product.query.js";

const router = Router();

router.get("/approved/:productId", async (req, res) => {
  const safeParams = validate(
    getApprovedRatingsOfProductParamsSchema,
    req.params,
  );
  const safeSearchParams = validate(
    getApprovedRatingsOfProductSearchParamsSchema,
    req.query,
  );

  const service = req.scope.resolve(GET_APPROVED_RATINGS_OF_PRODUCT_SERVICE);
  const query = new GetApprovedRatingsOfProductQuery(
    safeParams.productId,
    safeSearchParams.limit ?? 10,
    safeSearchParams.cursor
      ? {
          productId: safeParams.productId,
          createdAt: safeSearchParams.cursor.createdAt,
          userId: safeSearchParams.cursor.userId,
        }
      : undefined,
  );

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.get("/pending/:productId", adminMiddleware, async (req, res) => {
  const safeParams = validate(
    getPendingRatingsOfProductParamsSchema,
    req.params,
  );
  const safeSearchParams = validate(
    getPendingRatingsOfProductSearchParamsSchema,
    req.query,
  );

  const service = req.scope.resolve(GET_PENDING_RATINGS_OF_PRODUCT_SERVICE);
  const query = new GetPendingRatingsOfProductQuery(
    safeParams.productId,
    safeSearchParams.limit ?? 10,
    safeSearchParams.cursor
      ? {
          productId: safeParams.productId,
          createdAt: safeSearchParams.cursor.createdAt,
          userId: safeSearchParams.cursor.userId,
        }
      : undefined,
  );

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.get("/client/:clientId", adminMiddleware, async (req, res) => {
  const safeParams = validate(getRatingsOfClientParamsSchema, req.params);
  const safeSearchParams = validate(
    getRatingsOfClientSearchParamsSchema,
    req.query,
  );

  const service = req.scope.resolve(GET_RATINGS_OF_CLIENT_SERVICE);
  const query = new GetRatingsOfClientQuery(
    safeParams.clientId,
    safeSearchParams.limit ?? 10,
    safeSearchParams.cursor
      ? {
          userId: safeParams.clientId,
          createdAt: safeSearchParams.cursor.createdAt,
          productId: safeSearchParams.cursor.productId,
        }
      : undefined,
  );

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.get("/did-i-rate/:productId", clientMiddleware, async (req, res) => {
  const safeParams = validate(didIRateProductParamsSchema, req.params);
  const userId = req.user!.id; // auth middleware ensures req.user is defined

  const service = req.scope.resolve(DID_USER_RATE_PRODUCT_SERVICE);
  const query = new DidUserRateProductQuery(userId, safeParams.productId);

  const result = await service.execute(query);

  res.status(200).json(result);
});

export default router;
