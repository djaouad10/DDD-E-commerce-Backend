import { Router } from "express";
import { validate } from "../utils/validation.js";
import {
  getCommunesOfWilayaParamsSchema,
  getCommunesOfWilayaSearchParamsSchema,
  getDeliveryFeesOfWilayaParamsSchema,
  getDeliveryFeesOfWilayaSearchParamsSchema,
  getShippingLabelParamsSchema,
  getShippingLabelSearchParamsSchema,
  getShippingWilayasSearchParamsSchema,
} from "../validators/shipping.js";
import {
  GET_ACTIVE_WILAYAS_OF_PROVIDER_SERVICE,
  GET_COMMUNES_OF_WILAYA_SERVICE,
  GET_DELIVERY_FEES_OF_WILAYA_SERVICE,
  GET_SHIPPING_LABEL_SERVICE,
} from "#/composition/utils/tokens.js";
import { GetActiveWilayasOfProviderQuery } from "#/application/queries/get-active-wilayas-of-provider.query.js";
import { GetCommunesOfWilayaQuery } from "#/application/queries/get-communes-of-wilaya.query.js";
import { GetDeliveryFeesOfWilayaQuery } from "#/application/queries/get-delivery-fees-of-wilaya.query.js";
import { GetShippingLabelQuery } from "#/application/queries/get-shipping-label.query.js";
import { adminMiddleware } from "../middleware/admin-middleware.js";
import { authMiddleware } from "../middleware/auth-middleware.js";

const router = Router();

router.get("/wilayas", async (req, res) => {
  const safeSearchParams = validate(
    getShippingWilayasSearchParamsSchema,
    req.query,
  );

  const service = req.scope.resolve(GET_ACTIVE_WILAYAS_OF_PROVIDER_SERVICE);
  const query = new GetActiveWilayasOfProviderQuery(safeSearchParams.provider);

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.get("/communes/:wilayaCode", async (req, res) => {
  const safeParams = validate(getCommunesOfWilayaParamsSchema, req.params);
  const safeSearchParams = validate(
    getCommunesOfWilayaSearchParamsSchema,
    req.query,
  );

  const service = req.scope.resolve(GET_COMMUNES_OF_WILAYA_SERVICE);
  const query = new GetCommunesOfWilayaQuery(
    safeSearchParams.provider,
    safeParams.wilayaCode,
  );

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.get("/fees/:wilayaCode", async (req, res) => {
  const safeParams = validate(getDeliveryFeesOfWilayaParamsSchema, req.params);
  const safeSearchParams = validate(
    getDeliveryFeesOfWilayaSearchParamsSchema,
    req.query,
  );

  const service = req.scope.resolve(GET_DELIVERY_FEES_OF_WILAYA_SERVICE);
  const query = new GetDeliveryFeesOfWilayaQuery(
    safeSearchParams.provider,
    safeParams.wilayaCode,
  );

  const result = await service.execute(query);

  res.status(200).json(result);
});

router.get(
  "/label/:tracking",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const safeParams = validate(getShippingLabelParamsSchema, req.params);
    const safeSearchParams = validate(
      getShippingLabelSearchParamsSchema,
      req.query,
    );

    const service = req.scope.resolve(GET_SHIPPING_LABEL_SERVICE);
    const query = new GetShippingLabelQuery(
      safeParams.tracking,
      safeSearchParams.provider,
    );

    const result = await service.execute(query);

    res.setHeader("Content-Type", result.contentType);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${result.filename ?? "label.pdf"}`,
    );

    res.send(result.buffer);
  },
);

export default router;
