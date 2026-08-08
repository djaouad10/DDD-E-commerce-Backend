import { CreateCategoryCommand } from "#/application/commands/create-category.command.js";
import {
  CREATE_CATEGORY_SERVICE,
  GET_CATEGORIES_SERVICE,
  UPDATE_CATEGORY_SERVICE,
} from "#/composition/tokens.js";
import { Router } from "express";
import {
  createCategoryBodySchema,
  updateCategoryBodySchema,
  updateCategoryParamsSchema,
} from "../validators/categories.js";
import { validate } from "../utils/validation.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";
import { UpdateCategoryCommand } from "#/application/commands/update-category.command.js";

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

router.patch("/:id", adminMiddleware, async (req, res) => {
  const safeParams = validate(updateCategoryParamsSchema, req.params);
  const safeBody = validate(updateCategoryBodySchema, req.body);

  const service = req.scope.resolve(UPDATE_CATEGORY_SERVICE);
  const command = new UpdateCategoryCommand(safeParams.id, safeBody.name);

  const result = await service.execute(command);

  res.status(200).json(result);
});

export default router;
