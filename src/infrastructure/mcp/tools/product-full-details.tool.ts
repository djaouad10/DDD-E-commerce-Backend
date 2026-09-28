import { GET_PRODUCT_FULL_DETAILS_SERVICE } from "#/composition/utils/tokens.js";
import { GetProductStaticDataQuery } from "#/application/queries/get-product-static-data.query.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getProductFullDetailsInputSchema,
  getProductFullDetailsOutputSchema,
} from "../validation/product-static-data.schemas.js";
import type { Scope } from "#/composition/utils/container.js";

export function getProductFullDetailsToolRegistration(
  scope: Scope,
  server: McpServer,
) {
  server.registerTool(
    "get-product-full-details",
    {
      description: toolDescription,
      inputSchema: getProductFullDetailsInputSchema,
      outputSchema: getProductFullDetailsOutputSchema,
    },
    async ({ productId }) => {
      try {
        const service = scope.resolve(GET_PRODUCT_FULL_DETAILS_SERVICE);

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
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                error instanceof Error
                  ? error.message
                  : "Unknown product full details search error",
            },
          ],
          structuredContent: {},
        };
      }
    },
  );
}

const toolDescription = `
Retrieve the full static details of a specific product with all of it's variation details
using its productId.

Use this after product-semantic-search identifies a relevant product,
when additional information is needed to answer the user's question, such as questions
about the product's variations availability, colors, sizes, weight, ...etc.

Returns the product's description, brand, material, pricing, category,
rating, images, variations data and timestamps. The product must exist.
`;
