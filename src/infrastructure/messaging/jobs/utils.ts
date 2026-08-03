import { CreateOrderInShippingProviderCommand } from "#/application/commands/create-order-in-shipping-provider.command.js";
import { CreateShipmentInShippingProviderCommand } from "#/application/commands/create-shipment-in-shipping-provider.command.js";
import { DeleteOrderFromShippingProviderCommand } from "#/application/commands/delete-order-from-shipping-provider.command.js";
import { UpdateOrderInShippingProviderCommand } from "#/application/commands/update-order-in-shipping-provider.command.js";
import { OutboxAction } from "#/application/repositories/outbox.repository.js";
import type { CreateOrderInShippingProviderService } from "#/application/services/create-order-in-shipping-provider.service.js";
import type { CreateShipmentInShippingProviderService } from "#/application/services/create-shipment-in-shipping-provider.service.js";
import type { DeleteOrderFromShippingProviderService } from "#/application/services/delete-order-from-shipping-provider.service.js";
import type { UpdateOrderInShippingProviderService } from "#/application/services/update-order-in-shipping-provider.service.js";
import {
  CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
  CREATE_SHIPMENT_IN_SHIPPING_PROVIDER_SERVICE,
  DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE,
  UPDATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
} from "#/composition/tokens.js";
import type { OutboxJobPayloadType } from "./validation.js";

type OutboxActionToCommand = {
  [OutboxAction.CREATE_ORDER_IN_SHIPPING_API]: CreateOrderInShippingProviderCommand;
  [OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API]: CreateShipmentInShippingProviderCommand;
  [OutboxAction.UPDATE_ORDER_IN_SHIPPING_API]: UpdateOrderInShippingProviderCommand;
  [OutboxAction.DELETE_ORDER_IN_SHIPPING_API]: DeleteOrderFromShippingProviderCommand;
};

type OutboxActionToHandlerService = {
  [OutboxAction.CREATE_ORDER_IN_SHIPPING_API]: CreateOrderInShippingProviderService;
  [OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API]: CreateShipmentInShippingProviderService;
  [OutboxAction.UPDATE_ORDER_IN_SHIPPING_API]: UpdateOrderInShippingProviderService;
  [OutboxAction.DELETE_ORDER_IN_SHIPPING_API]: DeleteOrderFromShippingProviderService;
};

type OutboxActionToToken = {
  [OutboxAction.CREATE_ORDER_IN_SHIPPING_API]: typeof CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE;
  [OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API]: typeof CREATE_SHIPMENT_IN_SHIPPING_PROVIDER_SERVICE;
  [OutboxAction.UPDATE_ORDER_IN_SHIPPING_API]: typeof UPDATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE;
  [OutboxAction.DELETE_ORDER_IN_SHIPPING_API]: typeof DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE;
};

export function buildOutboxCommand<T extends OutboxAction>(
  action: T,
  payload: OutboxJobPayloadType<T>,
): OutboxActionToCommand[T] {
  switch (action) {
    case OutboxAction.CREATE_ORDER_IN_SHIPPING_API: {
      const p = payload as OutboxJobPayloadType<
        typeof OutboxAction.CREATE_ORDER_IN_SHIPPING_API
      >;

      return new CreateOrderInShippingProviderCommand(
        p.orderId,
      ) as OutboxActionToCommand[T];
    }

    case OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API: {
      const p = payload as OutboxJobPayloadType<
        typeof OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API
      >;

      return new CreateShipmentInShippingProviderCommand(
        p.trackingNumber,
      ) as OutboxActionToCommand[T];
    }

    case OutboxAction.UPDATE_ORDER_IN_SHIPPING_API: {
      const p = payload as OutboxJobPayloadType<
        typeof OutboxAction.UPDATE_ORDER_IN_SHIPPING_API
      >;

      return new UpdateOrderInShippingProviderCommand(
        p.orderId,
      ) as OutboxActionToCommand[T];
    }

    case OutboxAction.DELETE_ORDER_IN_SHIPPING_API: {
      const p = payload as OutboxJobPayloadType<
        typeof OutboxAction.DELETE_ORDER_IN_SHIPPING_API
      >;

      return new DeleteOrderFromShippingProviderCommand(
        p.trackingNumber,
        p.shippingProvider,
      ) as OutboxActionToCommand[T];
    }

    default:
      const _exhaustive: never = action;
      throw new Error(`Unhandled outbox action: ${_exhaustive}`);
  }
}

type HandlerRegistryEntry<T extends OutboxAction> = {
  token: OutboxActionToToken[T];
  handlerMethod: (
    handler: OutboxActionToHandlerService[T],
    command: OutboxActionToCommand[T],
    jobId: string,
  ) => Promise<unknown>;
};

const handlerRegistry: { [K in OutboxAction]: HandlerRegistryEntry<K> } = {
  [OutboxAction.CREATE_ORDER_IN_SHIPPING_API]: {
    token: CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API]: {
    token: CREATE_SHIPMENT_IN_SHIPPING_PROVIDER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [OutboxAction.UPDATE_ORDER_IN_SHIPPING_API]: {
    token: UPDATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },

  [OutboxAction.DELETE_ORDER_IN_SHIPPING_API]: {
    token: DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE,
    async handlerMethod(handler, command, jobId) {
      return handler.execute(command, jobId);
    },
  },
};
