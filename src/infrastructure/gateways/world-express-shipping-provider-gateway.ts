import type { Order } from "#/domain/entities/order.js";
import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
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
    this.logger.info("createShipment called");

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

  private isSuccess(status: number): boolean {
    return status >= 200 && status < 300;
  }
}

type WECreateShipmentResBody = {
  tracking: string;
  success: boolean;
  reference: string;
};
