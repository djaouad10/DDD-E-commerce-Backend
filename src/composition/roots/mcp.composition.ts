import { GetProductsService } from "#/application/services/api/get-products.service.js";
import { ProductSemanticSearchService } from "#/application/services/mcp/product-semantic-search.service.js";
import {
  GemeniTextEmbeddingModelAdapter,
  type GemeniTextEmbeddingModelAdapterConfig,
} from "#/infrastructure/ai/adapters/gemeni-text-embedding-model.adapter.js";
import { createGemeniClient } from "#/infrastructure/ai/clients/gemeni-client.js";
import { aiEnv } from "#/infrastructure/config/env/env.ai.js";
import { PostgresProductQueries } from "#/infrastructure/databases/read-models/postgres/postgres-product-queries.js";
import { Container } from "../utils/container.js";
import { registerSharedInfrastructure } from "../utils/shared-registry.js";
import {
  DRIZZLE_DB,
  GEMENI_CLIENT,
  GET_PRODUCTS_SERVICE,
  PRODUCT_QUERIES,
  PRODUCT_SEMANTIC_SEARCH_SERVICE,
  TEXT_EMBEDDING_MODEL_PORT,
} from "../utils/tokens.js";

export function buildMcpContainer(): Container {
  const container = new Container();

  registerSharedInfrastructure(container);

  const gemeniClient = createGemeniClient({ API_KEY: aiEnv.GEMINI_API_KEY });

  container.register(GEMENI_CLIENT, () => gemeniClient, "singleton");

  const textEmbeddingModelConfig: GemeniTextEmbeddingModelAdapterConfig = {
    EMBEDDING_DIMENSIONS: aiEnv.EMBEDDING_DIMENSIONS,
    GEMINI_EMBEDDING_MODEL: aiEnv.GEMINI_EMBEDDING_MODEL,
  };

  container.register(
    TEXT_EMBEDDING_MODEL_PORT,
    (scope) =>
      new GemeniTextEmbeddingModelAdapter(
        scope.resolve(GEMENI_CLIENT),
        textEmbeddingModelConfig,
      ),
    "scoped",
  );

  container.register(
    PRODUCT_QUERIES,
    (scope) => new PostgresProductQueries(scope.resolve(DRIZZLE_DB)),
    "singleton",
  );

  container.register(
    PRODUCT_SEMANTIC_SEARCH_SERVICE,
    (scope) =>
      new ProductSemanticSearchService(
        scope.resolve(PRODUCT_QUERIES),
        scope.resolve(TEXT_EMBEDDING_MODEL_PORT),
      ),
    "scoped",
  );

  container.register(
    GET_PRODUCTS_SERVICE,
    (scope) => new GetProductsService(scope.resolve(PRODUCT_QUERIES)),
    "scoped",
  );

  return container;
}
