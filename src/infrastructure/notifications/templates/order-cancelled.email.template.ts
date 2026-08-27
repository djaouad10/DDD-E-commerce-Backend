import type { OrderSnapshot } from "#/domain/entities-snapshots/order.snapshot.js";

export function buildOrderCancelledEmailTemplate(data: {
  orderSnapshot: OrderSnapshot;
  cancelledAt: Date;
}) {
  const { orderSnapshot } = data;

  const totalAmount = orderSnapshot.totalOrderPrice.amount;
  const currency = orderSnapshot.totalOrderPrice.currency;

  return `
ORDER CANCELLED #${orderSnapshot.id}

Hello,

Your order #${orderSnapshot.id} has been cancelled successfully on ${data.cancelledAt.toLocaleDateString()} at ${data.cancelledAt.toLocaleTimeString()}


Order Summary:
• Order Date: ${new Date(orderSnapshot.createdAt).toLocaleString()}
• Total Items: ${orderSnapshot.orderItems.reduce((sum, item) => sum + item.qty, 0)}
• Total Amount: ${totalAmount} ${currency}

${orderSnapshot.trackingNumber ? `Tracking Number: ${orderSnapshot.trackingNumber}\n` : ""}

If you have any questions, please contact our support team.

We hope to serve you again in the future.

Regards,
The Team
`;
}
