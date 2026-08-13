import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { GetActiveWilayasOfProviderQuery } from "../queries/get-active-wilayas-of-provider.query.js";

export class GetActiveWilayasOfProviderService {
  private logger = createLogger("GetActiveWilayasOfProviderService");

  constructor(private shippingProviderGateway: ShippingProviderGateway) {}

  async execute(query: GetActiveWilayasOfProviderQuery) {
    this.logger.info("Getting active wilayas of provider", {
      provider: query.provider,
    });

    // here u would usually have an abstraction layer that maps the query.provider to the right shipping gateway implementation, but since I only have one shipping provider, I'll just use the gateway directly (it will use the only provider gateway implementation registered in API composition root, WORLD_EXPRESS_SHIPPING_PROVIDER_GATEWAY)

    return await this.shippingProviderGateway.getActiveWilayas();
  }
}
