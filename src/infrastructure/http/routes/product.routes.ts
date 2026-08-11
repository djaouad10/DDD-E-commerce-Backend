import { Router } from "express";
import { adminMiddleware } from "../middleware/admin-middleware.js";
import { UpdateProductMainImageCommand } from "#/application/commands/update-product-main-image.command.js";
import {
  DELETE_PRODUCT_IMAGE_SERVICE,
  GET_PRODUCT_VARIATIONS_SERVICE,
  UPDATE_PRODUCT_MAIN_IMAGE_SERVICE,
} from "#/composition/tokens.js";
import {
  deleteProductImageParamsSchema,
  getProductVariationsParamsSchema,
  updateProductMainImageBodySchema,
  updateProductMainImageParamsSchema,
} from "../validators/products.js";
import { validate } from "../utils/validation.js";
import { DeleteProductImageCommand } from "#/application/commands/delete-product-image.command.js";
import { GetProductVariationsQuery } from "#/application/queries/get-product-variations.query.js";

const router = Router();

router.patch("/:id/images/main", adminMiddleware, async (req, res) => {
  const safeParams = validate(updateProductMainImageParamsSchema, req.params);
  const safeBody = validate(updateProductMainImageBodySchema, req.body);

  const service = req.scope.resolve(UPDATE_PRODUCT_MAIN_IMAGE_SERVICE);
  const command = new UpdateProductMainImageCommand(safeParams.id, safeBody);

  await service.execute(command);

  res.status(200).json({ success: true });
});

router.delete("/:id/images/:key", adminMiddleware, async (req, res) => {
  const safeParams = validate(deleteProductImageParamsSchema, req.params);

  const service = req.scope.resolve(DELETE_PRODUCT_IMAGE_SERVICE);
  const command = new DeleteProductImageCommand(safeParams.id, safeParams.key);

  await service.execute(command);

  res.status(200).json({ success: true });
});

router.get("/:id/variations", async (req, res) => {
  const safeParams = validate(getProductVariationsParamsSchema, req.params);

  const service = req.scope.resolve(GET_PRODUCT_VARIATIONS_SERVICE);
  const query = new GetProductVariationsQuery(safeParams.id);

  const result = await service.execute(query);

  res.status(200).json(result);
});

export default router;
