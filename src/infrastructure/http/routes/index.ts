import { Router } from "express";
import CategoryRouter from "./category.routes.js";
import CartRouter from "./cart.routes.js";
import OrderRouter from "./order.routes.js";
import ProductRouter from "./product.routes.js";
import RatingRouter from "./rating.routes.js";
import ClientRouter from "./client.routes.js";
import ShippingRouter from "./shipping.routes.js";

// all sub routers are wired here
const router = Router();

router.use("/categories", CategoryRouter);
router.use("/cart", CartRouter);
router.use("/orders", OrderRouter);
router.use("/products", ProductRouter);
router.use("/ratings", RatingRouter);
router.use("/clients", ClientRouter);
router.use("/shipping", ShippingRouter);

export default router;
