// you can import the OrderRow type from the drizzle schema file?

import { OrderItem } from "#/domain/entities/order-item.js";
import { Order } from "#/domain/entities/order.js";
import { Money } from "#/domain/value-objects/money.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { OrderItemId } from "#/domain/value-objects/order-item-id.js";
import { ShippingDetails } from "#/domain/value-objects/shipping-details.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import { Weight } from "#/domain/value-objects/weight.js";
import type {
  DrizzleOrderItemSelect,
  DrizzleOrderSelect,
} from "../../schema.js";

export type OrderItemRow = DrizzleOrderItemSelect;

export type OrderRow = DrizzleOrderSelect;

export type OrderWithItemsRow = OrderRow & { order_items: OrderItemRow[] };

export class PostgresOrderMapper {
  static toDomain(orderRow: OrderWithItemsRow): Order {
    const items = (orderRow.order_items ?? []).map((item) => {
      return OrderItem.reconstitute(
        OrderItemId.of(item.id),
        VariationId.of(item.variation_id),
        item.qty,
        Money.of(item.unit_price_at_order_time, "DZD"),
        item.unit_discount_price_at_order_time
          ? Money.of(item.unit_discount_price_at_order_time, "DZD")
          : null,
        Weight.of(item.weight_at_order_time, "g"),
      );
    });

    return Order.reconstitute(
      OrderId.of(orderRow.id),
      UserId.of(orderRow.user_id),
      orderRow.tracking_number,
      orderRow.status,
      orderRow.shipping_status,
      Money.of(orderRow.shipping_price_at_order_time, "DZD"),
      orderRow.selected_shipping_provider,
      ShippingDetails.reconstitute(
        orderRow.shipping_details.delivery_type,
        orderRow.shipping_details.full_name,
        orderRow.shipping_details.first_phone,
        orderRow.shipping_details.wilaya_code,
        orderRow.shipping_details.commune,
        orderRow.shipping_details.postal_code,
        orderRow.shipping_details.address,
        orderRow.shipping_details.fragile,
        orderRow.shipping_details.second_phone ?? undefined,
        orderRow.shipping_details.gps_link ?? undefined,
        orderRow.shipping_details.client_note ?? undefined,
      ),
      items,
      orderRow.created_at,
      orderRow.updated_at,orderRow.version
    );
  }

  static toRow(order: Order): OrderRow {
    return {
      id: order.id.value,
      user_id: order.userId.value,
      tracking_number: order.getTrackingNumber(),
      status: order.getStatus(),
      shipping_status: order.getShippingStatus(),
      shipping_price_at_order_time: order.getShippingPriceAtOrderTime().amount,
      selected_shipping_provider: order.getSelectedShippingProvider(),
      shipping_details: {
        delivery_type: order.getShippingDetails().deliveryType,
        full_name: order.getShippingDetails().getFullName(),
        first_phone: order.getShippingDetails().getFirstPhone(),
        wilaya_code: order.getShippingDetails().getWilayaCode(),
        commune: order.getShippingDetails().getCommune(),
        postal_code: order.getShippingDetails().getPostalCode(),
        address: order.getShippingDetails().getAddress(),
        fragile: order.getShippingDetails().getFragile(),
        second_phone: order.getShippingDetails().getSecondPhone(),
        gps_link: order.getShippingDetails().getGpsLink(),
        client_note: order.getShippingDetails().getClientNote(),
      },
      created_at: order.getCreatedAt(),
      updated_at: order.getUpdatedAt(),
      version: order.getVersion(),
    };
  }

  static toOrderItemsRows(order: Order): OrderItemRow[] {
    return order.getOrderItems().map((item) => ({
      id: item.id.value,
      orderId: order.id.value,
      variation_id: item.getVariationId().value,
      qty: item.getQty(),
      unit_price_at_order_time: item.unitPriceAtOrderTime.amount,
      unit_discount_price_at_order_time:
        item.unitDiscountPriceAtOrderTime?.amount ?? null,
      weight_at_order_time: item.weightAtOrderTime.weight,
    }));
  }
}
