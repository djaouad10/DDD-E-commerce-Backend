import { Router } from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { validate } from "../utils/validation.js";
import { getClientProfileSearchParamsSchema } from "../validators/client.js";
import { GET_CLIENT_PROFILE_SERVICE } from "#/composition/tokens.js";
import { GetClientProfileQuery } from "#/application/queries/get-client-profile.query.js";
import type { UserDTO } from "#/application/dto/user.dto.js";

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

export default router;
