import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import type { Commune } from "#/domain/value-objects/commune.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { GetCommunesOfWilayaQuery } from "../../queries/get-communes-of-wilaya.query.js";

export class GetCommunesOfWilayaService {
  private logger = createLogger("GetCommunesOfWilayaService");

  constructor(private shippingProviderGateway: ShippingProviderGateway) {}

  async execute(query: GetCommunesOfWilayaQuery): Promise<Commune[]> {
    this.logger.info("Getting communes of wilaya", {
      provider: query.provider,
      wilayaCode: query.wilayaCode,
    });

    // here u would usually have an abstraction layer that maps the query.provider to the right shipping gateway implementation, but since I only have one shipping provider, I'll just use the gateway directly (it will use the only provider gateway implementation registered in API composition root, WORLD_EXPRESS_SHIPPING_PROVIDER_GATEWAY)

    return await this.shippingProviderGateway.getActiveCommunesOfWilaya(
      query.wilayaCode,
    );
  }
}
