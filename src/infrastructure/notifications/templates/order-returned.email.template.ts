import type { OrderSnapshot } from "#/domain/entities-snapshots/order.snapshot.js";

export function buildOrderReturnedEmailTemplate(data: {
  orderSnapshot: OrderSnapshot;
  returnedAt: Date;
}) {
  const { orderSnapshot, returnedAt } = data;

  const totalItems = orderSnapshot.totalItemsPrice;

  return `
ORDER RETURNED #${orderSnapshot.id}

Hello ${orderSnapshot.shippingDetails.fullName || "Customer"},

Your order #${orderSnapshot.id} has been returned successfully.

Return Details:
• Return Date: ${returnedAt.toLocaleString()}
• Order Date: ${new Date(orderSnapshot.createdAt).toLocaleString()}
• Total Items: ${totalItems}

Refund Processing:

${orderSnapshot.trackingNumber ? `\nReturn Tracking: ${orderSnapshot.trackingNumber}\n` : ""}

If you have any questions about your return, please contact our support team.

We hope to see you again soon!

Regards,
The Team
`;
}
