import type {
  ShippingLabel,
  ShippingProviderGateway,
} from "#/domain/gateways/shipping-provider.gateway.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { GetShippingLabelQuery } from "../queries/get-shipping-label.query.js";

export class GetShippingLabelService {
  private logger = createLogger("GetShippingLabelService");
  constructor(private shippingProviderGateway: ShippingProviderGateway) {}

  async execute(query: GetShippingLabelQuery): Promise<ShippingLabel> {
    this.logger.info(`GetShippingLabelService.execute called`, { query });

    return await this.shippingProviderGateway.getShippingLabel(
      query.trackingNumber,
    );
  }
}
