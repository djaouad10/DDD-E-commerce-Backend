import { CreateOrderInShippingProviderCommand } from "#/application/commands/outbox-handlers/create-order-in-shipping-provider.command.js";
import { ActivateShipmentInShippingProviderCommand } from "#/application/commands/outbox-handlers/activate-shipment-in-shipping-provider.command.js";
import { DeleteOrderFromShippingProviderCommand } from "#/application/commands/outbox-handlers/delete-order-from-shipping-provider.command.js";
import { UpdateOrderInShippingProviderCommand } from "#/application/commands/outbox-handlers/update-order-in-shipping-provider.command.js";
import { OutboxAction } from "#/application/ports/persistence/outbox.repository.port.js";
import type { CreateOrderInShippingProviderService } from "#/application/services/outbox-handlers/create-order-in-shipping-provider.service.js";
import type { ActivateShipmentInShippingProviderService } from "#/application/services/outbox-handlers/activate-shipment-in-shipping-provider.service.js";
import type { DeleteOrderFromShippingProviderService } from "#/application/services/outbox-handlers/delete-order-from-shipping-provider.service.js";
import type { UpdateOrderInShippingProviderService } from "#/application/services/outbox-handlers/update-order-in-shipping-provider.service.js";
import type { InjectionToken, Scope } from "#/composition/container.js";
import {
  CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
  CREATE_SHIPMENT_IN_SHIPPING_PROVIDER_SERVICE,
  DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE,
  UPDATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
} from "#/composition/tokens.js";
import type { OutboxJobPayloadType } from "./validation.js";

type OutboxActionToCommand = {
  [OutboxAction.CREATE_ORDER_IN_SHIPPING_API]: CreateOrderInShippingProviderCommand;
  [OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API]: ActivateShipmentInShippingProviderCommand;
  [OutboxAction.UPDATE_ORDER_IN_SHIPPING_API]: UpdateOrderInShippingProviderCommand;
  [OutboxAction.DELETE_ORDER_IN_SHIPPING_API]: DeleteOrderFromShippingProviderCommand;
};

type OutboxActionToHandlerService = {
  [OutboxAction.CREATE_ORDER_IN_SHIPPING_API]: CreateOrderInShippingProviderService;
  [OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API]: ActivateShipmentInShippingProviderService;
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

      return new ActivateShipmentInShippingProviderCommand(
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

export async function executeOutboxHandler<T extends OutboxAction>(
  action: T,
  scope: Scope,
  command: OutboxActionToCommand[T],
  jobId: string,
): Promise<unknown> {
  const entry = handlerRegistry[action];
  const service = scope.resolve<OutboxActionToHandlerService[T]>(
    entry.token as InjectionToken<OutboxActionToHandlerService[T]>,
  );
  return entry.handlerMethod(service, command, jobId);
}
