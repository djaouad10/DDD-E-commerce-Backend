import type { CartRepository } from "#/domain/repositories/cart.repository.js";
import type { CategoryRepository } from "#/domain/repositories/category.repository.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";

// Infrastructure tokens
export const DB = Symbol("db") as symbol & { __type: DrizzleDBClient }; // this __type is what allows TS later to infer the type of instance this token's registration resolves to

// add queues and redis connection here later...
