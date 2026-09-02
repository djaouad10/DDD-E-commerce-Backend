import type { OrderSnapshot } from "#/domain/entities-snapshots/order.snapshot.js";

export function buildOrderDeliveredEmailTemplate(data: {
  orderSnapshot: OrderSnapshot;
  deliveredAt: Date;
}) {
  const { orderSnapshot, deliveredAt } = data;

  const totalAmount = orderSnapshot.totalOrderPrice.amount;
  const currency = orderSnapshot.totalOrderPrice.currency;
  const totalItems = orderSnapshot.orderItems.reduce(
    (sum, item) => sum + item.qty,
    0,
  );

  return `
ORDER DELIVERED #${orderSnapshot.id}

Hello ${orderSnapshot.shippingDetails.fullName || "Customer"},

Your order #${orderSnapshot.id} has been delivered successfully!

Delivery Details:
• Delivered On: ${deliveredAt.toLocaleString()}
• Order Date: ${new Date(orderSnapshot.createdAt).toLocaleString()}
• Total Items: ${totalItems}
• Total Amount: ${totalAmount} ${currency}
• Shipping Method: ${orderSnapshot.selectedShippingProvider}

${orderSnapshot.trackingNumber ? `\nTracking Number: ${orderSnapshot.trackingNumber}\n` : ""}

If you're satisfied with your purchase, we'd love to hear your feedback!

Having issues? Contact our support team at [support email].

Thank you for choosing us!

Regards,
The Team
`;
}
