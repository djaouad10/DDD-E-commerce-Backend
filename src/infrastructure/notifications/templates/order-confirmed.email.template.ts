import type { ShippingProvider } from "#/domain/entities/order.js";
import type { Currency } from "#/domain/value-objects/money.js";

export function buildOrderConfirmedEmailTemplate(data: {
  orderId: string;
  occurredOn: Date;
  itemCount: number;
  currency: Currency;
  totalPrice: number;
  selectedShippingProvider: ShippingProvider;
}) {
  return `
Dear Customer,

We are pleased to confirm that your order #${data.orderId} has been successfully placed and confirmed.

Order Details:
- Order ID: ${data.orderId}
- Order Date: ${data.occurredOn.toLocaleDateString()} at ${data.occurredOn.toLocaleTimeString()}
- Total Items: ${data.itemCount}
- Total Price: ${data.totalPrice} ${data.currency}
- Shipping Provider: ${data.selectedShippingProvider}

What's Next?
Your order is now being processed. You will receive a shipping confirmation email with tracking information once your order has been dispatched.

If you have any questions or need to make changes to your order, please don't hesitate to contact our customer support team.

Thank you for shopping with us!

Best regards,
The Team
`;
}
