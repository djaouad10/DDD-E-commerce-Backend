import { Router } from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";
import {
  ADD_ITEM_TO_CART_SERVICE,
  CLEAR_CART_SERVICE,
  DELETE_CART_ITEM_SERVICE,
  GET_USER_CART_SERVICE,
  UPDATE_CART_ITEM_SERVICE,
} from "#/composition/tokens.js";
import { GetUserCartQuery } from "#/application/queries/get-user-cart.query.js";
import { UpdateCartItemCommand } from "#/application/commands/update-cart-item.command.js";
import { validate } from "../utils/validation.js";
import {
  updateCartItemBodySchema,
  updateCartItemParamsSchema,
  deleteCartItemParamsSchema,
  addItemToCartBodySchema,
} from "../validators/cart.js";
import { DeleteCartItemCommand } from "#/application/commands/delete-cart-item.command.js";
import { ClearCartCommand } from "#/application/commands/clear-cart.command.js";
import { AddItemToCartCommand } from "#/application/commands/add-item-to-cart.command.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user!.id; // auth middleware ensures req.user is defined

  const service = req.scope.resolve(GET_USER_CART_SERVICE);
  const query = new GetUserCartQuery(userId);

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.patch("/items/:id", authMiddleware, async (req, res) => {
  const safeBody = validate(updateCartItemBodySchema, req.body);
  const safeParams = validate(updateCartItemParamsSchema, req.params);

  const userId = req.user!.id; // auth middleware ensures req.user is defined

  const service = req.scope.resolve(UPDATE_CART_ITEM_SERVICE);
  const command = new UpdateCartItemCommand(
    userId,
    safeParams.id,
    safeBody.newQty,
  );

  await service.execute(command);

  res.status(200).json({ success: true });
});

router.delete("/items/:id", authMiddleware, async (req, res) => {
  const safeParams = validate(deleteCartItemParamsSchema, req.params);

  const userId = req.user!.id; // auth middleware ensures req.user is defined

  const service = req.scope.resolve(DELETE_CART_ITEM_SERVICE);
  const command = new DeleteCartItemCommand(userId, safeParams.id);

  await service.execute(command);

  res.status(200).json({ success: true });
});

router.delete("/clear", authMiddleware, async (req, res) => {
  const userId = req.user!.id; // auth middleware ensures req.user is defined

  const service = req.scope.resolve(CLEAR_CART_SERVICE);
  const command = new ClearCartCommand(userId);

  await service.execute(command);

  res.status(200).json({ success: true });
});

router.post("/items", authMiddleware, async (req, res) => {
  const safeBody = validate(addItemToCartBodySchema, req.body);

  const userId = req.user!.id; // auth middleware ensures req.user is defined

  const service = req.scope.resolve(ADD_ITEM_TO_CART_SERVICE);
  const command = new AddItemToCartCommand(
    userId,
    safeBody.variationId,
    safeBody.qty,
  );

  const result = await service.execute(command);

  res.status(200).json(result);
});

export default router;
