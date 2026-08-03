import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { UpdateOrderInShippingProviderCommand } from "../commands/update-order-in-shipping-provider.command.js";
import type { IdempotencyKeysRepository } from "../repositories/idempotency-keys.repository.js";

export class UpdateOrderInShippingProviderService {
  private logger = createLogger("CreateShipmentInShippingProviderService");

  constructor(
    private db: DrizzleDBClient,
    private shippingProviderGateway: ShippingProviderGateway,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: UpdateOrderInShippingProviderCommand,
    jobId: string,
  ): Promise<void> {}
}
