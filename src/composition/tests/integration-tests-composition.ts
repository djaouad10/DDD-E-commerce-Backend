import { createDb } from "#/infrastructure/config/database.js";
import { env } from "#/infrastructure/config/env.js";
import { createRedisConnection } from "#/infrastructure/config/redis-connection.js";
import { Container } from "../container.js";

import { PostgresCartQueries } from "#/infrastructure/databases/read-models/postgres/postgres-cart-queries.js";
import { PostgresCategoryQueries } from "#/infrastructure/databases/read-models/postgres/postgres-category-queries.js";
import { PostgresOrderQueries } from "#/infrastructure/databases/read-models/postgres/postgres-order-queries.js";
import { PostgresProductQueries } from "#/infrastructure/databases/read-models/postgres/postgres-product-queries.js";
import { PostgresRatingQueries } from "#/infrastructure/databases/read-models/postgres/postgres-rating-queries.js";
import { PostgresUserQueries } from "#/infrastructure/databases/read-models/postgres/postgres-user-queries.js";
import { PostgresCartRepository } from "#/infrastructure/databases/repositories/postgres/postgres-cart-repository.js";
import { PostgresCategoryRepository } from "#/infrastructure/databases/repositories/postgres/postgres-category-repository.js";
import { PostgresOrderRepository } from "#/infrastructure/databases/repositories/postgres/postgres-order-repository.js";
import { PostgresOutboxRepository } from "#/infrastructure/databases/repositories/postgres/postgres-outbox-repository.js";
import { PostgresProductRepository } from "#/infrastructure/databases/repositories/postgres/postgres-product-repository.js";
import { PostgresRatingRepository } from "#/infrastructure/databases/repositories/postgres/postgres-rating-repository.js";
import { PostgresUserRepository } from "#/infrastructure/databases/repositories/postgres/postgres-user-repository.js";

import {
  CART_QUERIES,
  CART_REPOSITORY,
  CATEGORY_QUERIES,
  CATEGORY_REPOSITORY,
  DB,
  ORDER_QUERIES,
  ORDER_REPOSITORY,
  OUTBOX_REPOSITORY,
  PRODUCT_QUERIES,
  PRODUCT_REPOSITORY,
  RATING_QUERIES,
  RATING_REPOSITORY,
  USER_QUERIES,
  USER_REPOSITORY,
  GET_CATEGORIES_SERVICE,
  REDIS,
  FILE_STORE_GATEWAY,
  SHIPPING_PROVIDER_GATEWAY,
  UTAPI,
  HTTP_CLIENT,
  AUTH,
  CREATE_CATEGORY_SERVICE,
  UPDATE_CATEGORY_SERVICE,
  DELETE_CATEGORY_SERVICE,
  GET_USER_CART_SERVICE,
  UPDATE_CART_ITEM_SERVICE,
  DELETE_CART_ITEM_SERVICE,
  CLEAR_CART_SERVICE,
  ADD_ITEM_TO_CART_SERVICE,
  GET_CLIENT_PROFILE_SERVICE,
  GET_CLIENT_BAN_STATUS_SERVICE,
  GET_CLIENTS_LIST_SERVICE,
  UPDATE_PRODUCT_MAIN_IMAGE_SERVICE,
  DELETE_PRODUCT_IMAGE_SERVICE,
  GET_PRODUCT_VARIATIONS_SERVICE,
  GET_PRODUCT_VARIATIONS_WITH_CART_FLAG_SERVICE,
} from "../tokens.js";
import GetCategoriesService from "#/application/services/get-categories.service.js";
import { UTApi } from "uploadthing/server";
import { UploadthingFileStoreGateway } from "#/infrastructure/gateways/uploadthing-file-store-gateway.js";
import { WorldExpressShippingProviderGateway } from "#/infrastructure/gateways/world-express-shipping-provider-gateway.js";
import { FetchHttpClient } from "#/infrastructure/http/client/fetch-http-client.js";
import { fakeAuth } from "#/tests/helpers/fake-auth.js";
import { CreateCategoryService } from "#/application/services/create-category.service.js";
import { UpdateCategoryService } from "#/application/services/update-category.service.js";
import { DeleteCategoryService } from "#/application/services/delete-category.service.js";
import { GetUserCartService } from "#/application/services/get-user-cart.service.js";
import { UpdateCartItemService } from "#/application/services/update-cart-item.service.js";
import { DeleteCartItemService } from "#/application/services/delete-cart-item.service.js";
import { ClearCartService } from "#/application/services/clear-cart.service.js";
import { AddItemToCartService } from "#/application/services/add-item-to-cart.service.js";
import { GetClientProfileService } from "#/application/services/get-client-profile.service.js";
import { GetClientBanStatusService } from "#/application/services/get-client-ban-status.service.js";
import { GetClientsListService } from "#/application/services/get-clients-list.service.js";
import { UpdateProductMainImageService } from "#/application/services/update-product-main-image.service.js";
import { DeleteProductImageService } from "#/application/services/delete-product-image.service.js";
import { GetProductVariationsService } from "#/application/services/get-product-variations.service.js";
import { GetProductVariationsWithCartFlagService } from "#/application/services/get-product-variations-with-cart-flag.service.js";

export function buildIntegrationTestsContainer(): Container {
  const container = new Container();

  const testDb = createDb({ connectionUrl: env.DATABASE_URL, maxPoolSize: 1 });

  container.registerInstance(DB, testDb);

  const testRedis = createRedisConnection({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  container.registerInstance(REDIS, testRedis);

  // register repositories (singletons)
  container.register(
    CART_REPOSITORY,
    (scope) => new PostgresCartRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    CATEGORY_REPOSITORY,
    (scope) => new PostgresCategoryRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    ORDER_REPOSITORY,
    (scope) => new PostgresOrderRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    PRODUCT_REPOSITORY,
    (scope) => new PostgresProductRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    RATING_REPOSITORY,
    (scope) => new PostgresRatingRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    USER_REPOSITORY,
    (scope) => new PostgresUserRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    OUTBOX_REPOSITORY,
    (scope) => new PostgresOutboxRepository(scope.resolve(DB)),
    "singleton",
  );

  // register read models (singletons)
  container.register(
    CART_QUERIES,
    (scope) => new PostgresCartQueries(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    CATEGORY_QUERIES,
    (scope) => new PostgresCategoryQueries(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    ORDER_QUERIES,
    (scope) => new PostgresOrderQueries(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    PRODUCT_QUERIES,
    (scope) => new PostgresProductQueries(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    RATING_QUERIES,
    (scope) => new PostgresRatingQueries(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    USER_QUERIES,
    (scope) => new PostgresUserQueries(scope.resolve(DB)),
    "singleton",
  );

  // register gateways and http client
  container.register(
    HTTP_CLIENT,
    () => new FetchHttpClient(15000),
    "singleton",
  );

  const utApi = new UTApi({});
  container.registerInstance(UTAPI, utApi);

  container.register(
    FILE_STORE_GATEWAY,
    (scope) => new UploadthingFileStoreGateway(scope.resolve(UTAPI)),
    "scoped",
  );

  container.register(
    SHIPPING_PROVIDER_GATEWAY,
    (scope) =>
      new WorldExpressShippingProviderGateway(
        scope.resolve(HTTP_CLIENT),
        env.WORLD_EXPRESS_API_URL,
        env.WORLD_EXPRESS_API_KEY,
      ),
    "scoped",
  );

  // other

  container.register(AUTH, () => fakeAuth, "singleton");

  // register services
  container.register(
    GET_CATEGORIES_SERVICE,
    (scope) => new GetCategoriesService(scope.resolve(CATEGORY_QUERIES)),
    "scoped",
  );

  container.register(
    CREATE_CATEGORY_SERVICE,
    (scope) =>
      new CreateCategoryService(
        scope.resolve(DB),
        scope.resolve(CATEGORY_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    UPDATE_CATEGORY_SERVICE,
    (scope) =>
      new UpdateCategoryService(
        scope.resolve(DB),
        scope.resolve(CATEGORY_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_CATEGORY_SERVICE,
    (scope) =>
      new DeleteCategoryService(
        scope.resolve(DB),
        scope.resolve(CATEGORY_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    GET_USER_CART_SERVICE,
    (scope) =>
      new GetUserCartService(
        scope.resolve(CART_QUERIES),
        scope.resolve(USER_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    UPDATE_CART_ITEM_SERVICE,
    (scope) =>
      new UpdateCartItemService(
        scope.resolve(DB),
        scope.resolve(CART_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
        scope.resolve(USER_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_CART_ITEM_SERVICE,
    (scope) =>
      new DeleteCartItemService(
        scope.resolve(DB),
        scope.resolve(CART_REPOSITORY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    CLEAR_CART_SERVICE,
    (scope) =>
      new ClearCartService(
        scope.resolve(DB),
        scope.resolve(CART_REPOSITORY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    ADD_ITEM_TO_CART_SERVICE,
    (scope) =>
      new AddItemToCartService(
        scope.resolve(DB),
        scope.resolve(CART_REPOSITORY),
        scope.resolve(USER_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    GET_CLIENT_PROFILE_SERVICE,
    (scope) => new GetClientProfileService(scope.resolve(USER_REPOSITORY)),
    "scoped",
  );

  container.register(
    GET_CLIENT_BAN_STATUS_SERVICE,
    (scope) => new GetClientBanStatusService(scope.resolve(USER_REPOSITORY)),
    "scoped",
  );

  container.register(
    GET_CLIENTS_LIST_SERVICE,
    (scope) => new GetClientsListService(scope.resolve(USER_QUERIES)),
    "scoped",
  );

  container.register(
    UPDATE_PRODUCT_MAIN_IMAGE_SERVICE,
    (scope) =>
      new UpdateProductMainImageService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_PRODUCT_IMAGE_SERVICE,
    (scope) =>
      new DeleteProductImageService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_REPOSITORY),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    GET_PRODUCT_VARIATIONS_SERVICE,
    (scope) =>
      new GetProductVariationsService(
        scope.resolve(PRODUCT_QUERIES),
        scope.resolve(PRODUCT_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    GET_PRODUCT_VARIATIONS_WITH_CART_FLAG_SERVICE,
    (scope) =>
      new GetProductVariationsWithCartFlagService(
        scope.resolve(PRODUCT_QUERIES),
      ),
    "scoped",
  );

  return container;
}
