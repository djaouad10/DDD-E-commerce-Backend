import { GET_PRODUCT_STATIC_DATA_SERVICE } from "#/composition/utils/tokens.js";
import { GetProductStaticDataQuery } from "#/application/queries/get-product-static-data.query.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getProductStaticDataInputSchema,
  getProductStaticDataOutputSchema,
} from "../validation/product-static-data.schemas.js";
import type { Scope } from "#/composition/utils/container.js";

export function getProductStaticDataToolRegistration(
  scope: Scope,
  server: McpServer,
) {
  server.registerTool(
    "get-product-static-details",
    {
      description: toolDescription,
      inputSchema: getProductStaticDataInputSchema,
      outputSchema: getProductStaticDataOutputSchema,
    },
    async ({ productId }) => {
      const service = scope.resolve(GET_PRODUCT_STATIC_DATA_SERVICE);

      const result = await service.execute(
        new GetProductStaticDataQuery(productId),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
        structuredContent: result,
      };
    },
  );
}

const toolDescription = `
Retrieve the full static details of a specific product using its productId.

Use this after product-semantic-search identifies a relevant product,
when additional information is needed to answer the user's question.

Returns the product's description, brand, material, pricing, category,
rating, images, and timestamps. The product must exist.
`;
