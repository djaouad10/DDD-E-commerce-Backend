import type { TextEmbeddingModelPort } from "#/application/ports/ai/text-embedding-model.port.js";
import type { ProductSemanticSearchQuery } from "#/application/queries/product-semantic-search.query.js";
import type { ProductQueries } from "#/application/read-models/product.queries.js";
import { GatewayError } from "#/shared/errors/errors.js";
import { createLogger } from "#/shared/logging/logger.js";

export class ProductSemanticSearchService {
  private logger = createLogger("ProductSemanticSearchService");

  constructor(
    private productQueries: ProductQueries,
    private embeddingModel: TextEmbeddingModelPort,
  ) {}

  async execute(query: ProductSemanticSearchQuery) {
    this.logger.info("ProductSemanticSearchService.execute called", { query });

    // embed the query.query
    const [embedding] = await this.embeddingModel.embed([query.query]);

    if (!embedding)
      throw new GatewayError(
        "embeddingModel",
        new Error("No embedding returned"),
      );

    return await this.productQueries.semanticSearch({
      queryVector: embedding,
      limit: query.limit ?? 5,
      filters: query.filters ?? {},
    });
  }
}
