import { Router } from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { GET_USER_CART_SERVICE } from "#/composition/tokens.js";
import { GetUserCartQuery } from "#/application/queries/get-user-cart.query.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user!.id; // auth middleware ensures req.user is defined

  const service = req.scope.resolve(GET_USER_CART_SERVICE);
  const query = new GetUserCartQuery(userId);

  const result = await service.execute(query);

  res.status(200).json(result);
});

export default router;
