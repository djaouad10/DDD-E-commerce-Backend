import { Router } from "express";
import { adminMiddleware } from "../middleware/admin-middleware.js";
import { UpdateProductMainImageCommand } from "#/application/commands/update-product-main-image.command.js";
import {
  DELETE_PRODUCT_IMAGE_SERVICE,
  GET_LOW_STOCK_PRODUCTS_SERVICE,
  GET_PRODUCT_STATIC_DATA_SERVICE,
  GET_PRODUCT_VARIATIONS_SERVICE,
  GET_PRODUCT_VARIATIONS_WITH_CART_FLAG_SERVICE,
  GET_PRODUCTS_SERVICE,
  UPDATE_PRODUCT_MAIN_IMAGE_SERVICE,
} from "#/composition/tokens.js";
import {
  deleteProductImageParamsSchema,
  getLowStockProductsSearchParamsSchema,
  getProductsSearchParamsSchema,
  getProductStaticDataParamsSchema,
  getProductVariationsParamsSchema,
  getProductVariationsWithCartFlagParamsSchema,
  updateProductMainImageBodySchema,
  updateProductMainImageParamsSchema,
} from "../validators/products.js";
import { validate } from "../utils/validation.js";
import { DeleteProductImageCommand } from "#/application/commands/delete-product-image.command.js";
import { GetProductVariationsQuery } from "#/application/queries/get-product-variations.query.js";
import { GetProductVariationsWithCartFlagQuery } from "#/application/queries/get-product-variations-with-cart-flag.query.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { GetProductsQuery } from "#/application/queries/get-products.query.js";
import { GetLowStockProductsQuery } from "#/application/queries/get-low-stock-products.query.js";
import { GetProductStaticDataQuery } from "#/application/queries/get-product-static-data.query.js";

const router = Router();

router.patch(
  "/:id/images/main",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeSearchParams = validate(
      updateProductMainImageParamsSchema,
      req.params,
    );
    const safeBody = validate(updateProductMainImageBodySchema, req.body);

    const service = req.scope.resolve(UPDATE_PRODUCT_MAIN_IMAGE_SERVICE);
    const command = new UpdateProductMainImageCommand(
      safeSearchParams.id,
      safeBody,
    );

    await service.execute(command);

    res.status(200).json({ success: true });
  },
);

router.delete(
  "/:id/images/:key",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeSearchParams = validate(
      deleteProductImageParamsSchema,
      req.params,
    );

    const service = req.scope.resolve(DELETE_PRODUCT_IMAGE_SERVICE);
    const command = new DeleteProductImageCommand(
      safeSearchParams.id,
      safeSearchParams.key,
    );

    await service.execute(command);

    res.status(200).json({ success: true });
  },
);

router.get("/:id/variations", async (req, res) => {
  const safeSearchParams = validate(
    getProductVariationsParamsSchema,
    req.params,
  );

  const service = req.scope.resolve(GET_PRODUCT_VARIATIONS_SERVICE);
  const query = new GetProductVariationsQuery(safeSearchParams.id);

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.get(
  "/:id/variations/with-cart-flag",
  authMiddleware,
  async (req, res) => {
    const safeSearchParams = validate(
      getProductVariationsWithCartFlagParamsSchema,
      req.params,
    );

    const userId = req.user!.id; // auth middleware ensures req.user is defined

    const service = req.scope.resolve(
      GET_PRODUCT_VARIATIONS_WITH_CART_FLAG_SERVICE,
    );
    const query = new GetProductVariationsWithCartFlagQuery(
      safeSearchParams.id,
      userId,
    );

    const result = await service.execute(query);

    res.status(200).json(result);
  },
);

router.get("/", async (req, res) => {
  const safeSearchParams = validate(getProductsSearchParamsSchema, req.query);

  const service = req.scope.resolve(GET_PRODUCTS_SERVICE);
  const query = new GetProductsQuery(
    safeSearchParams.limit ?? 10,
    safeSearchParams.categoryId,
    safeSearchParams.cursor,
    safeSearchParams.max_price,
    safeSearchParams.min_price,
  );

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.get("/low-stock", authMiddleware, adminMiddleware, async (req, res) => {
  const safeSearchParams = validate(
    getLowStockProductsSearchParamsSchema,
    req.query,
  );

  const service = req.scope.resolve(GET_LOW_STOCK_PRODUCTS_SERVICE);
  const query = new GetLowStockProductsQuery(
    safeSearchParams.limit ?? 10,
    safeSearchParams.minStock ?? 0,
    safeSearchParams.cursor,
  );

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.get("/:id/static-data", async (req, res) => {
  const safeParams = validate(getProductStaticDataParamsSchema, req.params);

  const service = req.scope.resolve(GET_PRODUCT_STATIC_DATA_SERVICE);
  const query = new GetProductStaticDataQuery(safeParams.id);

  const result = await service.execute(query);

  res.status(200).json(result);
});

export default router;
