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
import { UploadthingFileStoreGateway } from "#/infrastructure/gateways/uploadthing-file-store-gateway.js";
import { Container } from "./container.js";
import { registerSharedInfrastructure } from "./shared-registry.js";
import {
  CART_QUERIES,
  CART_REPOSITORY,
  CATEGORY_QUERIES,
  CATEGORY_REPOSITORY,
  DB,
  FILE_STORE_GATEWAY,
  ORDER_QUERIES,
  ORDER_REPOSITORY,
  OUTBOX_REPOSITORY,
  PRODUCT_QUERIES,
  PRODUCT_REPOSITORY,
  RATING_QUERIES,
  RATING_REPOSITORY,
  USER_QUERIES,
  USER_REPOSITORY,
  HTTP_CLIENT,
  SHIPPING_PROVIDER_GATEWAY,
  UTAPI,
  AUTH,
  GET_CATEGORIES_SERVICE,
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
} from "./tokens.js";

import { UTApi } from "uploadthing/server";
import { FetchHttpClient } from "#/infrastructure/http/client/fetch-http-client.js";
import { WorldExpressShippingProviderGateway } from "#/infrastructure/gateways/world-express-shipping-provider-gateway.js";
import { env } from "#/infrastructure/config/env.js";
import { initializeAuth } from "#/infrastructure/config/auth.js";
import GetCategoriesService from "#/application/services/get-categories.service.js";
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

export function buildApiContainer(): Container {
  // API process shared container
  const container = new Container();

  // Shared infrastructure (db, redis, queues)
  registerSharedInfrastructure(container);

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
    AUTH,
    (scope) =>
      initializeAuth(scope.resolve(DB), scope.resolve(USER_REPOSITORY)),
    "singleton",
  );

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

  return container;
}
