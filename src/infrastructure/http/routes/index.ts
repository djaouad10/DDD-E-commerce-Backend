import { Router } from "express";
import CategoryRouter from "./category.routes.js";
import CartRouter from "./cart.routes.js";
import OrderRouter from "./order.routes.js";
import ProductRouter from "./product.routes.js";
import RatingRouter from "./rating.routes.js";
import UserRouter from "./user.routes.js";

// all sub routers are wired here
const router = Router();

router.use("/categories", CategoryRouter);
router.use("/cart", CartRouter);
router.use("/orders", OrderRouter);
router.use("/products", ProductRouter);
router.use("/ratings", RatingRouter);
router.use("/users", UserRouter);

export default router;
