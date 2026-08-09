import { Router } from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { validate } from "../utils/validation.js";
import { getClientProfileSearchParamsSchema } from "../validators/client.js";
import {
  GET_CLIENT_BAN_STATUS_SERVICE,
  GET_CLIENT_PROFILE_SERVICE,
} from "#/composition/tokens.js";
import { GetClientProfileQuery } from "#/application/queries/get-client-profile.query.js";
import type { UserDTO } from "#/application/dto/user.dto.js";
import { deleteCartItemParamsSchema } from "../validators/cart.js";
import { GetClientBanStatusQuery } from "#/application/queries/get-client-ban-status.query.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";

const router = Router();

router.get("/profile", authMiddleware, async (req, res) => {
  let clientId: string;

  if (req.user!.role === "ADMIN") {
    // if user is admin, get clientId from search params
    const safeSearchParams = validate(
      getClientProfileSearchParamsSchema,
      req.query,
    );

    clientId = safeSearchParams.id;
  } else {
    // if user is client, use his id
    clientId = req.user!.id;
  }

  const service = req.scope.resolve(GET_CLIENT_PROFILE_SERVICE);
  const query = new GetClientProfileQuery(clientId);

  const result = await service.execute(query);

  // we have
  // result: UserSnapshot
  // if it changes in the future, we will catch response shape chnage at compile time
  const userDto: UserDTO = result;

  return res.status(200).json(userDto);
});

router.get("/ban-status/:id", adminMiddleware, async (req, res) => {
  const safeParams = validate(deleteCartItemParamsSchema, req.params);

  const service = req.scope.resolve(GET_CLIENT_BAN_STATUS_SERVICE);
  const query = new GetClientBanStatusQuery(safeParams.id);

  const result = await service.execute(query);

  return res.status(200).json(result);
});

export default router;
