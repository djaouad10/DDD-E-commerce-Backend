import { Router } from "express";
import { validate } from "../utils/validation.js";
import { getShippingWilayasSearchParamsSchema } from "../validators/shipping.js";
import { GET_ACTIVE_WILAYAS_OF_PROVIDER_SERVICE } from "#/composition/tokens.js";
import { GetActiveWilayasOfProviderQuery } from "#/application/queries/get-active-wilayas-of-provider.query.js";

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

export default router;
