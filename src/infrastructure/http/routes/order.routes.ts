import { Router } from "express";
import { validate } from "../utils/validation.js";
import {
  cancelOrderParamsSchema,
  confirmOrderParamsSchema,
  createOrderBodySchema,
  getOrderByIdParamsSchema,
  getOrderByTrackingNumberParamsSchema,
  getOrdersOfClientSearchParamsSchema,
  getOrdersSearchParamsSchema,
  shipOrderParamsSchema,
  updateShippingDetailsBodySchema,
  updateShippingDetailsParamsSchema,
} from "../validators/orders.js";
import {
  CANCEL_ORDER_SERVICE,
  CONFIRM_ORDER_SERVICE,
  CREATE_ORDER_SERVICE,
  GET_ORDER_BY_ID_SERVICE,
  GET_ORDER_BY_TRACKING_NUMBER_SERVICE,
  GET_ORDERS_OF_CLIENT_SERVICE,
  GET_ORDERS_SERVICE,
  SHIP_ORDER_SERVICE,
  UPDATE_SHIPPING_DETAILS_SERVICE,
} from "#/composition/tokens.js";
import { GetOrdersOfClientQuery } from "#/application/queries/get-orders-of-client.query.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { GetOrderByTrackingNumberQuery } from "#/application/queries/get-order-by-tracking-number.query.js";
import { GetOrderByIdQuery } from "#/application/queries/get-order-by-id.query.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";
import { GetOrdersQuery } from "#/application/queries/get-orders.query.js";
import { CreateOrderCommand } from "#/application/commands/create-order.command.js";
import { CancelOrderCommand } from "#/application/commands/cancel-order.command.js";
import { ConfirmOrderCommand } from "#/application/commands/confirm-order.command.js";
import { ShipOrderCommand } from "#/application/commands/ship-order-command.js";
import { UpdateShippingDetailsCommand } from "#/application/commands/update-shipping-details.command.js";

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

router.get("/single/:id", authMiddleware, async (req, res) => {
  const safeParams = validate(getOrderByIdParamsSchema, req.params);

  const service = req.scope.resolve(GET_ORDER_BY_ID_SERVICE);
  const query = new GetOrderByIdQuery(
    safeParams.id,
    req.user!.role === "CLIENT" ? req.user!.id : undefined, // auth middleware ensures req.user is defined
  );

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  const safeSearchParams = validate(getOrdersSearchParamsSchema, req.query);

  const service = req.scope.resolve(GET_ORDERS_SERVICE);
  const query = new GetOrdersQuery(
    safeSearchParams.limit ?? 10,
    safeSearchParams.status,
    safeSearchParams.cursor,
  );

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.post("/", authMiddleware, async (req, res) => {
  const safeBody = validate(createOrderBodySchema, req.body);
  const userId = req.user!.id; // auth middleware ensures req.user is defined

  const service = req.scope.resolve(CREATE_ORDER_SERVICE);
  const command = new CreateOrderCommand(
    safeBody.idempotencyKey,
    userId,
    safeBody.providedShippingPrice,
    safeBody.selectedShippingProvider,
    safeBody.shippingDetails,
  );

  const result = await service.execute(command);

  res.status(200).json({ orderId: result.value });
});

router.patch("/:id/cancel", authMiddleware, async (req, res) => {
  const safeParams = validate(cancelOrderParamsSchema, req.params);
  const userId = req.user!.role === "CLIENT" ? req.user!.id : undefined; // auth middleware ensures req.user is defined"

  const service = req.scope.resolve(CANCEL_ORDER_SERVICE);
  const command = new CancelOrderCommand(safeParams.id, userId);

  await service.execute(command);

  res.status(200).json({ success: true });
});

router.patch(
  "/:id/confirm",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(confirmOrderParamsSchema, req.params);

    const service = req.scope.resolve(CONFIRM_ORDER_SERVICE);
    const command = new ConfirmOrderCommand(safeParams.id);

    await service.execute(command);

    res.status(200).json({ success: true });
  },
);

router.patch("/:id/ship", authMiddleware, adminMiddleware, async (req, res) => {
  const safeParams = validate(shipOrderParamsSchema, req.params);

  const service = req.scope.resolve(SHIP_ORDER_SERVICE);
  const command = new ShipOrderCommand(safeParams.id);

  await service.execute(command);

  res.status(200).json({ success: true });
});

router.patch(
  "/:id/shipping-details",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(updateShippingDetailsParamsSchema, req.params);
    const safeBody = validate(updateShippingDetailsBodySchema, req.body);

    const service = req.scope.resolve(UPDATE_SHIPPING_DETAILS_SERVICE);
    const command = new UpdateShippingDetailsCommand(safeParams.id, {
      ...safeBody,
      phone2: safeBody.phone2 ?? null,
      note: safeBody.note ?? null,
      gpsLink: safeBody.gpsLink ?? null,
    });

    await service.execute(command);

    res.status(200).json({ success: true });
  },
);

export default router;
