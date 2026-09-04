import { Router } from "express";
import {
  approveRatingParamsSchema,
  approveRatingSearchParamsSchema,
  createRatingBodySchema,
  createRatingParamsSchema,
  deleteRatingParamsSchema,
  deleteRatingSearchParamsSchema,
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
  APPROVE_RATING_SERVICE,
  CREATE_RATING_SERVICE,
  DELETE_RATING_SERVICE,
  DID_USER_RATE_PRODUCT_SERVICE,
  GET_APPROVED_RATINGS_OF_PRODUCT_SERVICE,
  GET_PENDING_RATINGS_OF_PRODUCT_SERVICE,
  GET_RATINGS_OF_CLIENT_SERVICE,
} from "#/composition/utils/tokens.js";
import { GetApprovedRatingsOfProductQuery } from "#/application/queries/get-approved-ratings-of-product.query.js";
import { GetPendingRatingsOfProductQuery } from "#/application/queries/get-pending-ratings-of-product.query.js";
import { GetRatingsOfClientQuery } from "#/application/queries/get-ratings-of-client.query.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";
import { clientMiddleware } from "../middleware/client-middleware.js";
import { DidUserRateProductQuery } from "#/application/queries/did-user-rate-product.query.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { CreateRatingCommand } from "#/application/commands/api/create-rating.command.js";
import { DeleteRatingCommand } from "#/application/commands/api/delete-rating.command.js";
import { ApproveRatingCommand } from "#/application/commands/api/approve-rating.command.js";

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

router.get(
  "/pending/:productId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
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
  },
);

router.get(
  "/client/:clientId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
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
  },
);

router.get(
  "/did-i-rate/:productId",
  authMiddleware,
  clientMiddleware,
  async (req, res) => {
    const safeParams = validate(didIRateProductParamsSchema, req.params);
    const userId = req.user!.id; // auth middleware ensures req.user is defined

    const service = req.scope.resolve(DID_USER_RATE_PRODUCT_SERVICE);
    const query = new DidUserRateProductQuery(userId, safeParams.productId);

    const result = await service.execute(query);

    res.status(200).json(result);
  },
);

router.post(
  "/product/:productId",
  authMiddleware,
  clientMiddleware,
  async (req, res) => {
    const safeParams = validate(createRatingParamsSchema, req.params);
    const safeBody = validate(createRatingBodySchema, req.body);
    const userId = req.user!.id; // auth middleware ensures req.user is defined

    const service = req.scope.resolve(CREATE_RATING_SERVICE);
    const command = new CreateRatingCommand(
      safeParams.productId,
      userId,
      safeBody.rating,
      safeBody.comment,
    );

    await service.execute(command);

    res.status(200).json({ success: true });
  },
);

router.delete("/product/:productId", authMiddleware, async (req, res) => {
  const safeParams = validate(deleteRatingParamsSchema, req.params);
  let userId = req.user!.id; // clients only deletes their own ratings

  if (req.user!.role === "ADMIN") {
    const safeSearchParams = validate(deleteRatingSearchParamsSchema, req.body);

    userId = safeSearchParams.clientId; // admin deletes rating for client
  }

  const service = req.scope.resolve(DELETE_RATING_SERVICE);
  const command = new DeleteRatingCommand(safeParams.productId, userId);

  await service.execute(command);

  res.status(200).json({ success: true });
});

router.patch(
  "/product/:productId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(approveRatingParamsSchema, req.params);
    const safeSearchParams = validate(
      approveRatingSearchParamsSchema,
      req.body,
    );

    const service = req.scope.resolve(APPROVE_RATING_SERVICE);
    const command = new ApproveRatingCommand(
      safeParams.productId,
      safeSearchParams.clientId,
    );

    await service.execute(command);

    res.status(200).json({ success: true });
  },
);

export default router;
