import { Router } from "express";
import {
  getApprovedRatingsOfProductParamsSchema,
  getApprovedRatingsOfProductSearchParamsSchema,
  getPendingRatingsOfProductParamsSchema,
  getPendingRatingsOfProductSearchParamsSchema,
} from "../validators/ratings.js";
import { validate } from "../utils/validation.js";
import {
  GET_APPROVED_RATINGS_OF_PRODUCT_SERVICE,
  GET_PENDING_RATINGS_OF_PRODUCT_SERVICE,
} from "#/composition/tokens.js";
import { GetApprovedRatingsOfProductQuery } from "#/application/queries/get-approved-ratings-of-product.query.js";
import { GetPendingRatingsOfProductQuery } from "#/application/queries/get-pending-ratings-of-product.query.js";

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

router.get("/pending/:productId", async (req, res) => {
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

export default router;
