import { Order } from "./order.js";

// 2. The Vitest unit test suite
describe("Order Class", () => {
  beforeEach(() => {
    // Create a spy on console.log before each test
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original console.log behavior after each test
    vi.restoreAllMocks();
  });

  test('test() method logs "test" to the console', () => {
    const order = new Order();

    // Execute the target method
    order.test();

    // Assert that console.log was called exactly once
    expect(console.log).toHaveBeenCalledTimes(1);

    // Assert that console.log was called with the string "test"
    expect(console.log).toHaveBeenCalledWith("test");
  });
});
