import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CreateShipmentInShippingProviderCommand } from "../commands/create-shipment-in-shipping-provider.command.js";
import type { IdempotencyKeysRepository } from "../repositories/idempotency-keys.repository.js";

export class CreateShipmentInShippingProviderService {
  private logger = createLogger("CreateShipmentInShippingProviderService");

  constructor(
    private db: DrizzleDBClient,
    private shippingProviderGateway: ShippingProviderGateway,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: CreateShipmentInShippingProviderCommand,
    jobId: string,
  ): Promise<void> {}
}
