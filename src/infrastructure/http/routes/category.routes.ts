import { CreateCategoryCommand } from "#/application/commands/create-category.command.js";
import {
  CREATE_CATEGORY_SERVICE,
  GET_CATEGORIES_SERVICE,
} from "#/composition/tokens.js";
import { Router } from "express";
import { createCategoryBodySchema } from "../validators/categories.js";
import { validate } from "../utils/validation.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";

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

export default router;
