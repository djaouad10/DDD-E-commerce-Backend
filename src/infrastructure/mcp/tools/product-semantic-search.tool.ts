import { ProductSemanticSearchQuery } from "#/application/queries/product-semantic-search.query.js";
import { PRODUCT_SEMANTIC_SEARCH_SERVICE } from "#/composition/utils/tokens.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import {
  productSemanticSearchInputSchema,
  productSemanticSearchOutputSchema,
} from "../validation/product-semantic-search-schemas.js";
import type { Scope } from "#/composition/utils/container.js";

export function productSemanticSearchToolRegistration(
  scope: Scope,
  server: McpServer,
) {
  server.registerTool(
    "product-semantic-search",
    {
      description: toolDescription,
      inputSchema: productSemanticSearchInputSchema,
      outputSchema: productSemanticSearchOutputSchema,
    },
    async ({ query, limit, filters }) => {
      const service = scope.resolve(PRODUCT_SEMANTIC_SEARCH_SERVICE);
      const semanticSearchQuery = new ProductSemanticSearchQuery(query, limit, {
        ...(filters?.colors !== undefined && { colors: filters.colors }),
        ...(filters?.sizes !== undefined && { sizes: filters.sizes }),
        ...(filters?.maxPrice !== undefined && {
          maxPrice: filters.maxPrice,
        }),
        ...(filters?.minPrice !== undefined && {
          minPrice: filters.minPrice,
        }),
        ...(filters?.inStock !== undefined && { inStock: filters.inStock }),
      });

      const result = await service.execute(semanticSearchQuery);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    },
  );
}

const toolDescription = `
Find products matching a user's request using natural-language semantic
search, with optional filters for color, size, price, and stock.

Use this tool FIRST to discover and shortlist relevant products.
Returns lightweight product records, including productId, name, price,
and similarityDistance.

When you need more information about a candidate, call
get-product-static-details with its productId. Do not fetch full details
for every result unnecessarily.

Results are ordered by ascending cosine distance (smaller is a closer
semantic match). Semantic relevance does not guarantee that a product
satisfies every requested attribute; verify specific requirements
using product details. Price filters use the effective price
(discounted price when available, otherwise regular price), in DZD.
`;
