// what to test
// 1. generate()
// 2. of()
// 3. equals()

import { OrderId } from "./order-id.js";

describe("OrderId Value Object", () => {
  describe("OrderId.generate()", () => {
    test("it should generate a valid OrderId", () => {
      // Arrange & Act
      const orderId = OrderId.generate();

      // Assert
      expect(orderId.value).toMatch(/^ord_[a-zA-Z0-9]{32}$/);
    });
  });
});
