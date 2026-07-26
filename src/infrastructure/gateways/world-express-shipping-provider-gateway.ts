import type { Order } from "#/domain/entities/order.js";
import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import {
  HttpConnectionError,
  HttpTimeoutError,
} from "#/shared/errors/domain-error.js";
import {
  handleWorldExpressErrors,
  WorldExpressApiError,
} from "#/shared/errors/handle-world-express-errors.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { HttpClient } from "../http/client/http-client.js";

export class WorldExpressShippingProviderGateway implements ShippingProviderGateway {
  private logger = createLogger("WorldExpressShippingProviderGateway");

  constructor(
    private readonly httpClient: HttpClient,
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async createShipment(order: Order): Promise<{ trackingNumber: string }> {
    this.logger.debug("createShipment called");

    const orderId = order.id;
    const shippingDetails = order.getShippingDetails();

    const searchParams = new URLSearchParams({
      reference: orderId.value,
      nom_client: shippingDetails.getFullName(),
      telephone: shippingDetails.getFirstPhone(),
      telephone_2: shippingDetails.getSecondPhone() ?? "",
      adresse: shippingDetails.getAddress(),
      code_postal: shippingDetails.getPostalCode(),
      commune: shippingDetails.getCommune(),
      code_wilaya: String(shippingDetails.getWilayaCode()),
      montant: String(order.getTotalOrderPrice().amount),
      remarque: shippingDetails.getClientNote() ?? "",
      stock: "0",
      type: "1",
      stop_desk: shippingDetails.deliveryType === "TO_DESK" ? "1" : "0",
      weight: String(order.getTotalWeightInKg().weight),
      fragile: shippingDetails.getFragile() ? "1" : "0",
      gps_link: shippingDetails.getGpsLink() ?? "",
    });

    const url = `${this.baseUrl}/create/order?${searchParams.toString()}`;

    try {
      const response = await this.logger.measure(
        `httpClient.request(${url})`,
        () =>
          this.httpClient.request<WECreateShipmentResBody>({
            url,
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }),
      );

      if (!this.isSuccess(response.statusCode)) {
        throw new WorldExpressApiError(response.statusCode, response.body, url);
      }

      this.logger.debug("createShipment completed", {
        trackingNumber: response.body.tracking,
      });
      return {
        trackingNumber: response.body.tracking,
      };
    } catch (error) {
      this.logger.error("createShipment failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }

      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.createShipment",
      );
    }
  }

  async createManyShipments(orders: Order[]): Promise<{
    failed: OrderId[];
    created: { orderId: OrderId; trackingNumber: string }[];
  }> {
    this.logger.debug("createManyShipments called");

    try {
      const reqBody = orders.map((order) => {
        const orderId = order.id;
        const shippingDetails = order.getShippingDetails();

        return {
          reference: orderId.value,
          nom_client: shippingDetails.getFullName(),
          telephone: shippingDetails.getFirstPhone(),
          telephone_2: shippingDetails.getSecondPhone() ?? "",
          adresse: shippingDetails.getAddress(),
          code_postal: shippingDetails.getPostalCode(),
          commune: shippingDetails.getCommune(),
          code_wilaya: String(shippingDetails.getWilayaCode()),
          montant: String(order.getTotalOrderPrice().amount),
          remarque: shippingDetails.getClientNote() ?? "",
          stock: "0",
          type: "1",
          stop_desk: shippingDetails.deliveryType === "TO_DESK" ? "1" : "0",
          weight: String(order.getTotalWeightInKg().weight),
          fragile: shippingDetails.getFragile() ? "1" : "0",
          gps_link: shippingDetails.getGpsLink() ?? "",
        };
      });

      const url = `${this.baseUrl}/create/orders`;

      const response = await this.logger.measure(
        `httpClient.request(${url})`,
        () =>
          this.httpClient.request<WECreateManyShipmentsResBody>({
            url,
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: reqBody, // serilized by the http client
          }),
      );

      if (!this.isSuccess(response.statusCode)) {
        throw new WorldExpressApiError(response.statusCode, response.body, url);
      }

      const { created, failed } = this.formatManyShipmentsResBody(
        response.body,
      );

      this.logger.debug("createManyShipments completed", {
        createdCount: created.length,
        failedCount: failed.length,
      });

      return { created, failed };
    } catch (error) {
      this.logger.error("createManyShipments failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }

      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.createManyShipments",
      );
    }
  }

  private isSuccess(status: number): boolean {
    return status >= 200 && status < 300;
  }

  private formatManyShipmentsResBody(body: WECreateManyShipmentsResBody): {
    failed: OrderId[];
    created: { orderId: OrderId; trackingNumber: string }[];
  } {
    const { results } = body;

    const created: { orderId: OrderId; trackingNumber: string }[] = [];
    const failed: OrderId[] = [];

    for (const index in results) {
      const result = results[index]!;

      if (result.success) {
        created.push({
          orderId: OrderId.of(result.reference),
          trackingNumber: result.tracking,
        });
      } else {
        failed.push(OrderId.of(result.reference));
      }
    }

    return { created, failed };
  }
}

type WECreateShipmentResBody = {
  tracking: string;
  success: boolean;
  reference: string;
};

type WECreateManyShipmentsResBody = {
  results: Record<
    string,
    {
      success: boolean;
      tracking: string;
      reference: string;
    }
  >;
};
