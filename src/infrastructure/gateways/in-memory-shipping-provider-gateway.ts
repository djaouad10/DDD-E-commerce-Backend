// test/helpers/in-memory-shipping-provider-gateway.ts
import type {
  ShippingProviderGateway,
  ShippingLabel,
} from "#/domain/gateways/shipping-provider.gateway.js";
import type { Order, OrderStatus } from "#/domain/entities/order.js";
import type { Commune } from "#/domain/value-objects/commune.js";
import { DeliveryFees } from "#/domain/value-objects/delivery-fees.js";
import type { OrderId } from "#/domain/value-objects/order-id.js";
import { TrackingHistory } from "#/domain/value-objects/tracking-history.js";
import type { Wilaya } from "#/domain/value-objects/wilaya.js";
import { Money } from "#/domain/value-objects/money.js";

type ShipmentRecord = {
  order: Order;
  trackingNumber: string;
  status: OrderStatus;
  activated: boolean;
};

export class InMemoryShippingProviderGateway implements ShippingProviderGateway {
  // Seed data
  private wilayas: Wilaya[] = [];
  private communesByWilaya = new Map<number, Commune[]>();
  private feesByWilaya = new Map<number, DeliveryFees>();

  // Runtime state
  private shipments = new Map<string, ShipmentRecord>();
  private labels = new Map<string, ShippingLabel>();
  private trackingHistories = new Map<string, TrackingHistory[]>();

  // Test controls
  shouldFail = false;
  private failOnMethods: Set<string> = new Set();
  private trackingCounter = 1;

  // ── Seed Methods (for test setup) ──

  seedWilayas(wilayas: Wilaya[]): void {
    this.wilayas = wilayas;
  }

  seedCommunes(wilayaCode: number, communes: Commune[]): void {
    this.communesByWilaya.set(wilayaCode, communes);
  }

  seedFees(wilayaId: number, fees: DeliveryFees): void {
    this.feesByWilaya.set(wilayaId, fees);
  }

  seedShipment(trackingNumber: string, status: OrderStatus): void {
    this.shipments.set(trackingNumber, {
      order: {} as any, // dummy — delete only needs the key
      trackingNumber,
      status,
      activated: false,
    });
  }

  seedTrackingHistory(
    trackingNumber: string,
    history: TrackingHistory[],
  ): void {
    this.trackingHistories.set(trackingNumber, history);
  }

  seedLabel(trackingNumber: string, label: ShippingLabel): void {
    this.labels.set(trackingNumber, label);
  }

  setFailure(methodName?: string): void {
    this.shouldFail = true;
    if (methodName) this.failOnMethods.add(methodName);
  }

  clearFailure(): void {
    this.shouldFail = false;
    this.failOnMethods.clear();
  }

  // ── Private ──

  private checkFailure(methodName: string): void {
    if (
      this.shouldFail &&
      (this.failOnMethods.size === 0 || this.failOnMethods.has(methodName))
    ) {
      throw new Error(`InMemoryShippingProviderGateway.${methodName}() failed`);
    }
  }

  private generateTrackingNumber(): string {
    return `WE${String(this.trackingCounter++).padStart(6, "0")}`;
  }

  // ── Interface Implementation ──

  async getActiveWilayas(): Promise<Wilaya[]> {
    this.checkFailure("getActiveWilayas");
    return [...this.wilayas];
  }

  async getActiveCommunesOfWilaya(wilayaCode: number): Promise<Commune[]> {
    this.checkFailure("getActiveCommunesOfWilaya");
    return this.communesByWilaya.get(wilayaCode) ?? [];
  }

  async getShippingLabel(trackingNumber: string): Promise<ShippingLabel> {
    this.checkFailure("getShippingLabel");
    const label = this.labels.get(trackingNumber);
    if (!label) throw new Error(`Label not found for ${trackingNumber}`);
    return label;
  }

  async activateShipment(
    trackingNumber: string,
  ): Promise<{ success: boolean }> {
    this.checkFailure("activateShipment");
    const record = this.shipments.get(trackingNumber);
    if (!record) throw new Error(`Shipment not found: ${trackingNumber}`);
    record.activated = true;
    return { success: true };
  }

  async getDeliveryFeesOfWilaya(wilayaId: number): Promise<DeliveryFees> {
    this.checkFailure("getDeliveryFeesOfWilaya");
    const fees = this.feesByWilaya.get(wilayaId);
    if (!fees) {
      return new DeliveryFees(Money.of(0, "DZD"), Money.of(0, "DZD"));
    }
    return fees;
  }

  async createShipment(order: Order): Promise<{ trackingNumber: string }> {
    this.checkFailure("createShipment");
    const trackingNumber = this.generateTrackingNumber();
    this.shipments.set(trackingNumber, {
      order,
      trackingNumber,
      status: "SHIPPING",
      activated: false,
    });
    return { trackingNumber };
  }

  async createManyShipments(orders: Order[]): Promise<{
    failed: OrderId[];
    created: { orderId: OrderId; trackingNumber: string }[];
  }> {
    this.checkFailure("createManyShipments");
    const created: { orderId: OrderId; trackingNumber: string }[] = [];
    const failed: OrderId[] = [];

    for (const order of orders) {
      try {
        const { trackingNumber } = await this.createShipment(order);
        created.push({ orderId: order.id, trackingNumber });
      } catch {
        failed.push(order.id);
      }
    }

    return { created, failed };
  }

  async updateUnShippedShipment(order: Order): Promise<{ success: boolean }> {
    this.checkFailure("updateUnShippedShipment");
    const trackingNumber = order.getTrackingNumber();
    if (!trackingNumber) {
      throw new Error("Order has no tracking number");
    }
    const record = this.shipments.get(trackingNumber);
    if (!record) throw new Error(`Shipment not found: ${trackingNumber}`);
    record.order = order;
    return { success: true };
  }

  async deleteUnshippedShipment(
    trackingNumber: string,
  ): Promise<{ success: boolean }> {
    this.checkFailure("deleteUnshippedShipment");
    const deleted = this.shipments.delete(trackingNumber);
    return { success: deleted };
  }

  async getTrackingHistoryOfShipment(
    trackingNumber: string,
  ): Promise<TrackingHistory[]> {
    this.checkFailure("getTrackingHistoryOfShipment");
    return this.trackingHistories.get(trackingNumber) ?? [];
  }

  async getOneShipmentStatus(
    trackingNumber: string,
  ): Promise<{ status: OrderStatus }> {
    this.checkFailure("getOneShipmentStatus");
    const record = this.shipments.get(trackingNumber);
    if (!record) throw new Error(`Shipment not found: ${trackingNumber}`);
    return { status: record.status };
  }

  async getManyShipmentsStatuses(
    trackingNumbers: string[],
  ): Promise<{ trackingNumber: string; status: OrderStatus }[]> {
    this.checkFailure("getManyShipmentsStatuses");
    return trackingNumbers.map((tn) => {
      const record = this.shipments.get(tn);
      return {
        trackingNumber: tn,
        status: record?.status ?? "SHIPPING",
      };
    });
  }

  // ── Test Helpers ──

  getShipment(trackingNumber: string): ShipmentRecord | undefined {
    return this.shipments.get(trackingNumber);
  }

  getAllShipments(): ShipmentRecord[] {
    return Array.from(this.shipments.values());
  }

  isActivated(trackingNumber: string): boolean {
    return this.shipments.get(trackingNumber)?.activated ?? false;
  }

  clear(): void {
    this.wilayas = [];
    this.communesByWilaya.clear();
    this.feesByWilaya.clear();
    this.shipments.clear();
    this.labels.clear();
    this.trackingHistories.clear();
    this.trackingCounter = 1;
    this.clearFailure();
  }
}
