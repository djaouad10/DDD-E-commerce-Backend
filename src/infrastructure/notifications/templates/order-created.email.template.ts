import type { OrderSnapshot } from "#/domain/entities-snapshots/order.snapshot.js";

export function buildOrderCreatedEmailTemplate(data: {
  orderSnapshot: OrderSnapshot;
  createdAt: Date;
}) {
  const { orderSnapshot, createdAt } = data;

  const totalAmount = orderSnapshot.totalOrderPrice.amount;
  const currency = orderSnapshot.totalOrderPrice.currency;
  const totalItems = orderSnapshot.orderItems.reduce(
    (sum, item) => sum + item.qty,
    0,
  );

  return `
ORDER CONFIRMED #${orderSnapshot.id}

Hello ${orderSnapshot.shippingDetails.fullName || "Customer"},

Your order #${orderSnapshot.id} has been confirmed!

Order Summary:
• Order Date: ${createdAt.toLocaleString()}
• Total Items: ${totalItems}
• Total Amount: ${totalAmount} ${currency}

Shipping Address:
${orderSnapshot.shippingDetails.fullName}
${orderSnapshot.shippingDetails.address}
${orderSnapshot.shippingDetails.postalCode}, ${orderSnapshot.shippingDetails.commune}
Wilaya: ${orderSnapshot.shippingDetails.wilayaCode}

Shipping Method: ${orderSnapshot.selectedShippingProvider}

${orderSnapshot.trackingNumber ? `\nTracking Number: ${orderSnapshot.trackingNumber}\n` : ""}

You will receive a shipping confirmation email once your order is dispatched.

If you have any questions, please contact our support team.

Thank you for your order!

Regards,
The Team
`;
}
