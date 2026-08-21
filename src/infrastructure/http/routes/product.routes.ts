import { Router } from "express";
import { adminMiddleware } from "../middleware/admin-middleware.js";
import { UpdateProductMainImageCommand } from "#/application/commands/update-product-main-image.command.js";
import {
  ADD_SECONDARY_IMAGE_TO_PRODUCT_SERVICE,
  CREATE_PRODUCT_SERVICE,
  CREATE_VARIATION_OF_PRODUCT_SERVICE,
  DELETE_PRODUCT_IMAGE_SERVICE,
  DELETE_VARIATION_OF_PRODUCT_SERVICE,
  GET_LOW_STOCK_PRODUCTS_SERVICE,
  GET_PRODUCT_STATIC_DATA_SERVICE,
  GET_PRODUCT_UPDATE_DATA_SERVICE,
  GET_PRODUCT_VARIATIONS_SERVICE,
  GET_PRODUCT_VARIATIONS_WITH_CART_FLAG_SERVICE,
  GET_PRODUCTS_SERVICE,
  UPDATE_PRODUCT_MAIN_IMAGE_SERVICE,
  UPDATE_PRODUCT_SERVICE,
  UPDATE_VARIATION_OF_PRODUCT_SERVICE,
} from "#/composition/tokens.js";
import {
  createProductBodySchema,
  createProductImageBodySchema,
  createProductImageParamsSchema,
  createVariationOfProductBodySchema,
  createVariationOfProductParamsSchema,
  deleteProductImageParamsSchema,
  deleteVariationOfProductParamsSchema,
  getLowStockProductsSearchParamsSchema,
  getProductsSearchParamsSchema,
  getProductStaticDataParamsSchema,
  getProductUpdateDataParamsSchema,
  getProductVariationsParamsSchema,
  getProductVariationsWithCartFlagParamsSchema,
  updateProductBodySchema,
  updateProductMainImageBodySchema,
  updateProductMainImageParamsSchema,
  updateProductParamsSchema,
  updateVariationOfProductBodySchema,
  updateVariationOfProductParamsSchema,
} from "../validators/products.js";
import { validate } from "../utils/validation.js";
import { DeleteProductImageCommand } from "#/application/commands/delete-product-image.command.js";
import { GetProductVariationsQuery } from "#/application/queries/get-product-variations.query.js";
import { GetProductVariationsWithCartFlagQuery } from "#/application/queries/get-product-variations-with-cart-flag.query.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { GetProductsQuery } from "#/application/queries/get-products.query.js";
import { GetLowStockProductsQuery } from "#/application/queries/get-low-stock-products.query.js";
import { GetProductStaticDataQuery } from "#/application/queries/get-product-static-data.query.js";
import { GetProductUpdateDataQuery } from "#/application/queries/get-product-update-data.query.js";
import { AddSecondaryImageToProductCommand } from "#/application/commands/add-secondary-image-to-product.command.js";
import { UpdateVariationOfProductCommand } from "#/application/commands/update-variation-of-product.command.js";
import { CreateVariationOfProductCommand } from "#/application/commands/create-variation-of-product.command.js";
import { CreateProductCommand } from "#/application/commands/create-product-command.js";
import { UpdateProductCommand } from "#/application/commands/update-product.command.js";
import { DeleteVariationOfProductCommand } from "#/application/commands/delete-variation-of-product.command.js";

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

router.get(
  "/:id/update-data",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(getProductUpdateDataParamsSchema, req.params);

    const service = req.scope.resolve(GET_PRODUCT_UPDATE_DATA_SERVICE);
    const query = new GetProductUpdateDataQuery(safeParams.id);

    const result = await service.execute(query);

    res.status(200).json(result);
  },
);

router.post(
  "/:id/images",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(createProductImageParamsSchema, req.params);
    const safeBody = validate(createProductImageBodySchema, req.body);

    const service = req.scope.resolve(ADD_SECONDARY_IMAGE_TO_PRODUCT_SERVICE);
    const command = new AddSecondaryImageToProductCommand(
      safeParams.id,
      safeBody,
    );

    await service.execute(command);

    res.status(200).json({ success: true });
  },
);

router.patch(
  "/:productId/variations/:variationId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(
      updateVariationOfProductParamsSchema,
      req.params,
    );
    const safeBody = validate(updateVariationOfProductBodySchema, req.body);

    const service = req.scope.resolve(UPDATE_VARIATION_OF_PRODUCT_SERVICE);
    const command = new UpdateVariationOfProductCommand(
      safeParams.productId,
      safeParams.variationId,
      safeBody.newTotalQty,
      safeBody.newWeightInGrams,
    );

    await service.execute(command);

    res.status(200).json({ success: true });
  },
);

router.post(
  "/:id/variations",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(
      createVariationOfProductParamsSchema,
      req.params,
    );
    const safeBody = validate(createVariationOfProductBodySchema, req.body);

    const service = req.scope.resolve(CREATE_VARIATION_OF_PRODUCT_SERVICE);
    const command = new CreateVariationOfProductCommand(
      safeParams.id,
      safeBody,
    );

    const result = await service.execute(command);

    res.status(200).json(result);
  },
);

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  const {
    name,
    description,
    price,
    discountPrice,
    brand,
    material,
    mainImage,
    variations,
    categoryId,
  } = validate(createProductBodySchema, req.body);

  const service = req.scope.resolve(CREATE_PRODUCT_SERVICE);
  const command = new CreateProductCommand(
    name,
    description,
    brand,
    material,
    price,
    discountPrice,
    mainImage,
    variations,
    categoryId ?? undefined,
  );

  const result = await service.execute(command);

  res.status(200).json(result);
});

router.patch("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const safeParams = validate(updateProductParamsSchema, req.params);
  const safeBody = validate(updateProductBodySchema, req.body);

  const service = req.scope.resolve(UPDATE_PRODUCT_SERVICE);
  const command = new UpdateProductCommand(safeParams.id, {
    ...(safeBody.name !== undefined && { name: safeBody.name }),
    ...(safeBody.description !== undefined && {
      description: safeBody.description,
    }),
    ...(safeBody.price !== undefined && { price: safeBody.price }),
    ...(safeBody.discountPrice !== undefined && {
      discountPrice: safeBody.discountPrice,
    }),
    ...(safeBody.categoryId !== undefined && {
      categoryId: safeBody.categoryId,
    }),
    ...(safeBody.brand !== undefined && { brand: safeBody.brand }),
    ...(safeBody.material !== undefined && { material: safeBody.material }),
  });

  await service.execute(command);

  res.status(200).json({ success: true });
});

router.delete(
  "/:productId/variations/:variationId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(
      deleteVariationOfProductParamsSchema,
      req.params,
    );

    const service = req.scope.resolve(DELETE_VARIATION_OF_PRODUCT_SERVICE);
    const command = new DeleteVariationOfProductCommand(
      safeParams.productId,
      safeParams.variationId,
    );

    await service.execute(command);

    res.status(200).json({ success: true });
  },
);

export default router;
