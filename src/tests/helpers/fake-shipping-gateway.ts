import { vi } from "vitest";
import { faker } from "@faker-js/faker";
import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import { Commune } from "#/domain/value-objects/commune.js";
import { DeliveryFees } from "#/domain/value-objects/delivery-fees.js";
import { Money } from "#/domain/value-objects/money.js";
import { Wilaya } from "#/domain/value-objects/wilaya.js";
import {
  OrderTrackingStatus,
  TrackingHistory,
} from "#/domain/value-objects/tracking-history.js";
import type { Order } from "#/domain/entities/order.js";

export function communeFactory(
  overrides: Partial<{
    name: string;
    wilayaCode: number;
    postalCode: string;
    hasStopDesk: boolean;
  }> = {},
): Commune {
  return new Commune(
    overrides.name ?? faker.location.city(),
    overrides.wilayaCode ?? 16,
    overrides.postalCode ?? "16000",
    overrides.hasStopDesk ?? true,
  );
}

export function wilayaFactory(
  overrides: Partial<{ code: number; name: string }> = {},
): Wilaya {
  return new Wilaya(
    overrides.code ?? faker.number.int({ min: 1, max: 69 }),
    overrides.name ?? faker.location.state(),
  );
}

export function deliveryFeesFactory(
  overrides: Partial<{
    homeDeliveryFee: number;
    stopDeskFee: number;
  }> = {},
): DeliveryFees {
  return new DeliveryFees(
    Money.of(overrides.homeDeliveryFee ?? 400, "DZD"),
    Money.of(overrides.stopDeskFee ?? 350, "DZD"),
  );
}

export function trackingHistoryFactory(
  overrides: Partial<{
    date: Date;
    time: string;
    status: OrderTrackingStatus;
    station: string;
  }> = {},
): TrackingHistory {
  return new TrackingHistory(
    overrides.date ?? faker.date.recent(),
    overrides.time ?? "14:30:00",
    overrides.status ?? OrderTrackingStatus.PICKED,
    overrides.station ?? faker.location.city(),
  );
}

export function createFakeShippingProviderGateway() {
  const gateway = {
    getActiveWilayas: vi.fn(async () => [
      wilayaFactory({ code: 16, name: "Algiers" }),
    ]),

    getActiveCommunesOfWilaya: vi.fn(async (_wilayaCode: number) => [
      communeFactory(),
    ]),

    getDeliveryFeesOfWilaya: vi.fn(async (_wilayaId: number) =>
      deliveryFeesFactory(),
    ),

    getShippingLabel: vi.fn(async (_trackingNumber: string) => ({
      buffer: Buffer.from("fake-pdf-bytes"),
      contentType: "application/pdf",
      filename: "label.pdf",
    })),

    activateShipment: vi.fn(async (_trackingNumber: string) => ({
      success: true,
    })),

    createShipment: vi.fn(async (_order) => ({
      trackingNumber: `TRACK${faker.string.numeric(9)}`,
    })),

    createManyShipments: vi.fn(async (orders: Order[]) => ({
      failed: [],
      created: orders.map((o) => ({
        orderId: o.id,
        trackingNumber: `TRACK${faker.string.numeric(9)}`,
      })),
    })),

    updateUnShippedShipment: vi.fn(async (_order) => ({ success: true })),

    deleteUnshippedShipment: vi.fn(async (_trackingNumber: string) => ({
      success: true,
    })),

    getTrackingHistoryOfShipment: vi.fn(async (_trackingNumber: string) => [
      trackingHistoryFactory(),
    ]),

    getOneShipmentStatus: vi.fn(async (_trackingNumber: string) => ({
      status: "SHIPPING" as const,
    })),

    getManyShipmentsStatuses: vi.fn(async (trackingNumbers: string[]) =>
      trackingNumbers.map((trackingNumber) => ({
        trackingNumber,
        status: "SHIPPING" as const,
      })),
    ),
  } satisfies ShippingProviderGateway;

  return gateway;
}

export type FakeShippingProviderGateway = ReturnType<
  typeof createFakeShippingProviderGateway
>;
