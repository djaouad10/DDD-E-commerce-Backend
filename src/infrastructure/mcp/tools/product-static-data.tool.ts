import type { Container } from "#/composition/utils/container.js";
import { GET_PRODUCT_STATIC_DATA_SERVICE } from "#/composition/utils/tokens.js";
import { GetProductStaticDataQuery } from "#/application/queries/get-product-static-data.query.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getProductStaticDataInputSchema,
  getProductStaticDataOutputSchema,
} from "../validation/product-static-data.schemas.js";

export function getProductStaticDataToolRegistration(
  container: Container,
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
      const scope = container.createScope();

      try {
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
      } finally {
        await scope.dispose();
      }
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
