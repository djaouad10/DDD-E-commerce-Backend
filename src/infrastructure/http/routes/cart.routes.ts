import { Router } from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";
import {
  GET_USER_CART_SERVICE,
  UPDATE_CART_ITEM_SERVICE,
} from "#/composition/tokens.js";
import { GetUserCartQuery } from "#/application/queries/get-user-cart.query.js";
import { UpdateCartItemCommand } from "#/application/commands/update-cart-item.command.js";
import { validate } from "../utils/validation.js";
import {
  updateCartItemBodySchema,
  updateCartItemParamsSchema,
} from "../validators/cart.js";

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

export default router;
