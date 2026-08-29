import { CreateOrderInShippingProviderService } from "#/application/services/create-order-in-shipping-provider.service.js";
import { CreateShipmentInShippingProviderService } from "#/application/services/create-shipment-in-shipping-provider.service.js";
import { DeleteOrderFromShippingProviderService } from "#/application/services/delete-order-from-shipping-provider.service.js";
import { UpdateOrderInShippingProviderService } from "#/application/services/update-order-in-shipping-provider.service.js";
import { env } from "#/infrastructure/config/env.js";
import { PostgresIdempotencyKeysRepository } from "#/infrastructure/databases/repositories/postgres/postgres-idempotency-keys-repository.js";
import { PostgresOrderRepository } from "#/infrastructure/databases/repositories/postgres/postgres-order-repository.js";
import { WorldExpressShippingProviderGateway } from "#/infrastructure/gateways/world-express-shipping-provider-gateway.js";
import { FetchHttpClient } from "#/infrastructure/http/client/fetch-http-client.js";
import { Container } from "./container.js";
import { registerSharedInfrastructure } from "./shared-registry.js";
import {
  CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
  CREATE_SHIPMENT_IN_SHIPPING_PROVIDER_SERVICE,
  DB,
  DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE,
  HTTP_CLIENT,
  IDEMPOTENCY_KEYS_REPOSITORY,
  ORDER_REPOSITORY,
  SHIPPING_PROVIDER_GATEWAY,
  UPDATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
} from "./tokens.js";

export function buildOutboxHandlerContainer(): Container {
  const container = new Container();

  registerSharedInfrastructure(container);

  container.register(
    IDEMPOTENCY_KEYS_REPOSITORY,
    (scope) => new PostgresIdempotencyKeysRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    ORDER_REPOSITORY,
    (scope) => new PostgresOrderRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    HTTP_CLIENT,
    () => new FetchHttpClient(15000),
    "singleton",
  );

  container.register(
    SHIPPING_PROVIDER_GATEWAY,
    (scope) =>
      new WorldExpressShippingProviderGateway(
        scope.resolve(HTTP_CLIENT),
        env.WORLD_EXPRESS_API_URL,
        env.WORLD_EXPRESS_API_KEY,
      ),
    "singleton",
  );

  container.register(
    CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
    (scope) =>
      new CreateOrderInShippingProviderService(
        scope.resolve(DB),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE,
    (scope) =>
      new DeleteOrderFromShippingProviderService(
        scope.resolve(DB),
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    UPDATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
    (scope) =>
      new UpdateOrderInShippingProviderService(
        scope.resolve(DB),
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    CREATE_SHIPMENT_IN_SHIPPING_PROVIDER_SERVICE,
    (scope) =>
      new CreateShipmentInShippingProviderService(
        scope.resolve(DB),
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  return container;
}
