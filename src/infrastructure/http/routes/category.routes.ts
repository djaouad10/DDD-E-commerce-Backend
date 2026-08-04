import { GET_CATEGORIES_SERVICE } from "#/composition/tokens.js";
import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  const service = req.scope.resolve(GET_CATEGORIES_SERVICE);
  const result = await service.execute();

  res.status(200).json(result);
});

export default router;
