import { Router } from "express";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { validate } from "../utils/validation.js";
import {
  getClientProfileSearchParamsSchema,
  getClientBanStatusParamsSchema,
  getClientsListSearchParamsSchema,
  banClientParamsSchema,
  banClientBodySchema,
  unbanClientParamsSchema,
  updateClientProfileBodySchema,
} from "../validators/client.js";
import {
  BAN_CLIENT_SERVICE,
  GET_CLIENT_BAN_STATUS_SERVICE,
  GET_CLIENT_PROFILE_SERVICE,
  GET_CLIENTS_LIST_SERVICE,
  UNBAN_CLIENT_SERVICE,
  UPDATE_CLIENT_PROFILE_SERVICE,
} from "#/composition/tokens.js";
import { GetClientProfileQuery } from "#/application/queries/get-client-profile.query.js";
import type { UserDTO } from "#/application/dto/user.dto.js";
import { GetClientBanStatusQuery } from "#/application/queries/get-client-ban-status.query.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";
import { GetClientsListQuery } from "#/application/queries/get-clients-list.query.js";
import { BanClientCommand } from "#/application/commands/api/ban-client.command.js";
import { UnbanClientCommand } from "#/application/commands/api/unban-client.command.js";
import { clientMiddleware } from "../middleware/client-middleware.js";
import { UpdateClientProfileCommand } from "#/application/commands/api/update-client-profile.command.js";

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

router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  const safeSearchParams = validate(
    getClientsListSearchParamsSchema,
    req.query,
  );

  const service = req.scope.resolve(GET_CLIENTS_LIST_SERVICE);
  const query = new GetClientsListQuery(
    safeSearchParams.limit,
    safeSearchParams.role,
    safeSearchParams.cursor,
  );

  const result = await service.execute(query);

  return res.status(200).json(result);
});

router.get(
  "/ban-status/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(getClientBanStatusParamsSchema, req.params);

    const service = req.scope.resolve(GET_CLIENT_BAN_STATUS_SERVICE);
    const query = new GetClientBanStatusQuery(safeParams.id);

    const result = await service.execute(query);

    return res.status(200).json(result);
  },
);

router.patch(
  "/:id/status/ban",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(banClientParamsSchema, req.params);
    const safeBody = validate(banClientBodySchema, req.body);

    const service = req.scope.resolve(BAN_CLIENT_SERVICE);
    const command = new BanClientCommand(
      safeParams.id,
      safeBody.banExpiresInSeconds ?? undefined,
      safeBody.reason ?? undefined,
    );

    await service.execute(command);

    return res.status(200).json({ success: true });
  },
);

router.patch(
  "/:id/status/unban",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(unbanClientParamsSchema, req.params);

    const service = req.scope.resolve(UNBAN_CLIENT_SERVICE);
    const command = new UnbanClientCommand(safeParams.id);

    await service.execute(command);

    return res.status(200).json({ success: true });
  },
);

router.patch("/profile", authMiddleware, clientMiddleware, async (req, res) => {
  const safeBody = validate(updateClientProfileBodySchema, req.body);
  const userId = req.user!.id; // auth middleware ensures req.user is defined

  const service = req.scope.resolve(UPDATE_CLIENT_PROFILE_SERVICE);
  const command = new UpdateClientProfileCommand(
    userId,
    safeBody.name,
    safeBody.image,
  );

  await service.execute(command);

  return res.status(200).json({ success: true });
});

export default router;
