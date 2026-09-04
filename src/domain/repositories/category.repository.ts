import type { TransactionClient } from "#/shared/types/transaction-client.js";
import type { Category } from "../entities/category.js";
import type { CategoryId } from "../value-objects/category-id.js";

export type CategoryRepository = {
  find(id: CategoryId): Promise<Category | null>;
  findMany: () => Promise<Category[]>;
  save(category: Category, tx: TransactionClient): Promise<void>;
  delete(id: CategoryId, tx: TransactionClient): Promise<void>;
};
