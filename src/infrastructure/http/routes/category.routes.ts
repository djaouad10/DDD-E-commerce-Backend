import { CreateCategoryCommand } from "#/application/commands/api/create-category.command.js";
import {
  CREATE_CATEGORY_SERVICE,
  DELETE_CATEGORY_SERVICE,
  GET_CATEGORIES_SERVICE,
  UPDATE_CATEGORY_SERVICE,
} from "#/composition/tokens.js";
import { Router } from "express";
import {
  createCategoryBodySchema,
  deleteCategoryParamsSchema,
  updateCategoryBodySchema,
  updateCategoryParamsSchema,
} from "../validators/categories.js";
import { validate } from "../utils/validation.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";
import { UpdateCategoryCommand } from "#/application/commands/api/update-category.command.js";
import { DeleteCategoryCommand } from "#/application/commands/api/delete-category.command.js";
import { authMiddleware } from "../middleware/auth-middleware.js";

const router = Router();

router.get("/", async (req, res) => {
  const service = req.scope.resolve(GET_CATEGORIES_SERVICE);
  const result = await service.execute();

  res.status(200).json(result);
});

router.post("/", adminMiddleware, async (req, res) => {
  const safeBody = validate(createCategoryBodySchema, req.body);

  const service = req.scope.resolve(CREATE_CATEGORY_SERVICE);
  const command = new CreateCategoryCommand(safeBody.name);

  const result = await service.execute(command);

  res.status(201).json(result);
});

router.patch("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const safeParams = validate(updateCategoryParamsSchema, req.params);
  const safeBody = validate(updateCategoryBodySchema, req.body);

  const service = req.scope.resolve(UPDATE_CATEGORY_SERVICE);
  const command = new UpdateCategoryCommand(safeParams.id, safeBody.name);

  const result = await service.execute(command);

  res.status(200).json(result);
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const safeParams = validate(deleteCategoryParamsSchema, req.params);

  const service = req.scope.resolve(DELETE_CATEGORY_SERVICE);
  const command = new DeleteCategoryCommand(safeParams.id);

  const result = await service.execute(command);

  res.status(200).json(result);
});

export default router;
