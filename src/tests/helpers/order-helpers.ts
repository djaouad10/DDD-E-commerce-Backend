import type { Container } from "#/composition/utils/container.js";
import {
  ORDER_REPOSITORY,
  PRODUCT_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { Category } from "#/domain/entities/category.js";
import { OrderItem } from "#/domain/entities/order-item.js";
import { OrderStatus, type Order } from "#/domain/entities/order.js";
import { Color, Size } from "#/domain/entities/product.js";
import { Variation } from "#/domain/entities/variation.js";
import { Money } from "#/domain/value-objects/money.js";
import type { OrderId } from "#/domain/value-objects/order-id.js";
import { Weight } from "#/domain/value-objects/weight.js";
import {
  createCategoryInDB,
  createProductInDB,
  createUserInDB,
  saveOrderInDB,
} from "./db-helpers.js";
import { orderFactory, productFactory, userFactory } from "./domain-helpers.js";

const PATH_TO: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [],
  CONFIRMED: ["CONFIRMED"],
  PRE_TRANSIT: ["CONFIRMED", "PRE_TRANSIT"],
  SHIPPING: ["CONFIRMED", "PRE_TRANSIT", "SHIPPING"],
  DELIVERED: ["CONFIRMED", "PRE_TRANSIT", "SHIPPING", "DELIVERED"],
  RETURNED: ["CONFIRMED", "PRE_TRANSIT", "SHIPPING", "RETURNED"],
  CANCELLED: ["CANCELLED"],
  SUSPENDED: ["CONFIRMED", "PRE_TRANSIT", "SHIPPING", "SUSPENDED"],
};

const STEP_ACTIONS: Record<OrderStatus, (o: Order) => void> = {
  PENDING: () => {},
  CONFIRMED: (o) => o.confirm(),
  PRE_TRANSIT: (o) => o.markAsPreTransit(),
  SHIPPING: (o) => o.markAsShipping(),
  DELIVERED: (o) => o.markAsDelivered(),
  RETURNED: (o) => o.markAsReturned(),
  CANCELLED: (o) => o.cancel(),
  SUSPENDED: (o) => o.markAsSuspended(),
};

export async function progressOrderTo(
  container: Container,
  orderId: OrderId,
  target: OrderStatus,
  opts: { trackingNumber?: string } = {},
): Promise<Order> {
  const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
  const order = await orderRepo.find(orderId);
  if (!order) throw new Error(`order ${orderId.value} not found in DB`);

  // PRE_TRANSIT requires a tracking number to already be set.
  if (PATH_TO[target].includes("PRE_TRANSIT")) {
    order.setTrackingNumber(opts.trackingNumber ?? "TRACK000000");
  } else if (opts.trackingNumber) {
    order.setTrackingNumber(opts.trackingNumber);
  }

  for (const step of PATH_TO[target]) STEP_ACTIONS[step](order);

  await saveOrderInDB(container, order);

  const latestOrder = await orderRepo.find(orderId);

  if (!latestOrder) throw new Error(`order ${orderId.value} not found in DB`);
  // we return latest order since the last saveOrderInDB() call already increments the version in DB by one, so the current "order" variable is stale
  return latestOrder;
}

// Note:
// Order.create() sets an internal isNew = true flag; the repository uses that flag to decide INSERT vs UPDATE. If you call .confirm() on the in-memory object you built with orderFactory/setupOrderInDB and save it again, it's still flagged as new and gets re-inserted instead of updated. Re-fetching via orderRepo.find() gives you an object reconstituted with isNew = false.

export async function setupOrderWithReservedStock(
  container: Container,
  qty: number,
  qty2?: number,
) {
  const user = userFactory();
  const category = Category.create("Category");
  const product = productFactory({
    categoryId: category.id,
    customVariations: [
      Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
      Variation.create(Size.L, Color.BLUE, 100, 50, Weight.of(100, "g")),
    ],
  });
  const [v1, v2] = product.getVariations();

  await createUserInDB(container, user);
  await createCategoryInDB(container, category);
  await createProductInDB(container, product);

  const items = [
    OrderItem.create(
      v1!.id,
      qty,
      Money.of(3000, "DZD"),
      Weight.of(100, "g"),
      null,
    ),
    ...(qty2
      ? [
          OrderItem.create(
            v2!.id,
            qty2,
            Money.of(2000, "DZD"),
            Weight.of(100, "g"),
            null,
          ),
        ]
      : []),
  ];
  const order = orderFactory({ orderItems: items, userId: user.id });
  await saveOrderInDB(container, order);

  const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
  const sameProduct = await productRepository.find(product.id);
  sameProduct!.reserveStock(v1!.id, qty);
  if (qty2) sameProduct!.reserveStock(v2!.id, qty2);
  await createProductInDB(container, sameProduct!);

  const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
  // we must fetch the freshest version of the order & product, so any future DB save will work isntead of throwing an error because of stale version
  const latestOrder = await orderRepository.find(order.id);
  const latestProduct = await productRepository.find(product.id);

  return {
    user,
    order: latestOrder!,
    product: latestProduct!,
    variation1: v1!,
    variation2: v2,
    productRepository,
  };
}
