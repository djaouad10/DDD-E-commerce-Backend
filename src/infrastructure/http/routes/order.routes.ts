import { Router } from "express";
import { validate } from "../utils/validation.js";
import {
  getOrderByTrackingNumberParamsSchema,
  getOrdersOfClientSearchParamsSchema,
} from "../validators/orders.js";
import {
  GET_ORDER_BY_TRACKING_NUMBER_SERVICE,
  GET_ORDERS_OF_CLIENT_SERVICE,
} from "#/composition/tokens.js";
import { GetOrdersOfClientQuery } from "#/application/queries/get-orders-of-client.query.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { GetOrderByTrackingNumberQuery } from "#/application/queries/get-order-by-tracking-number.query.js";

const router = Router();

router.get("/client", authMiddleware, async (req, res) => {
  const service = req.scope.resolve(GET_ORDERS_OF_CLIENT_SERVICE);

  if (req.user!.role === "ADMIN") {
    const safeSearchParams = validate(
      getOrdersOfClientSearchParamsSchema,
      req.query,
    );

    const query = new GetOrdersOfClientQuery(
      safeSearchParams.clientId,
      safeSearchParams.limit ?? 10,
      safeSearchParams.cursor,
      safeSearchParams.status,
    );

    const result = await service.execute(query);

    return res.status(200).json(result);
  }

  const safeSearchParams = validate(
    getOrdersOfClientSearchParamsSchema.omit({ clientId: true }), // clientId doesn't exist for clients, so we omit it
    req.query,
  );

  const query = new GetOrdersOfClientQuery(
    req.user!.id, // we use current user id for clients
    safeSearchParams.limit ?? 10,
    safeSearchParams.cursor,
    safeSearchParams.status,
  );

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.get("/tracking/:tracking", authMiddleware, async (req, res) => {
  const safeParams = validate(getOrderByTrackingNumberParamsSchema, req.params);

  const service = req.scope.resolve(GET_ORDER_BY_TRACKING_NUMBER_SERVICE);
  const query = new GetOrderByTrackingNumberQuery(
    safeParams.tracking,
    req.user!.role === "CLIENT" ? req.user!.id : undefined, // auth middleware ensures req.user is defined
  );

  const result = await service.execute(query);

  res.status(200).json(result);
});

export default router;
