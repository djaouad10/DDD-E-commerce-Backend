import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import type { DeliveryFees } from "#/domain/value-objects/delivery-fees.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { GetDeliveryFeesOfWilayaQuery } from "../queries/get-delivery-fees-of-wilaya.query.js";

export class GetDeliveryFeesOfWilayaService {
  private logger = createLogger("GetDeliveryFeesOfWilayaService");

  constructor(private shippingProviderGateway: ShippingProviderGateway) {}

  async execute(query: GetDeliveryFeesOfWilayaQuery): Promise<DeliveryFees> {
    this.logger.info("GetDeliveryFeesOfWilayaService.execute called", {
      provider: query.provider,
      wilayaCode: query.wilayaCode,
    });

    // here u would usually have an abstraction layer that maps the query.provider to the right shipping gateway implementation, but since I only have one shipping provider, I'll just use the gateway directly (it will use the only provider gateway implementation registered in API composition root, WORLD_EXPRESS_SHIPPING_PROVIDER_GATEWAY)

    return await this.shippingProviderGateway.getDeliveryFeesOfWilaya(
      query.wilayaCode,
    );
  }
}
