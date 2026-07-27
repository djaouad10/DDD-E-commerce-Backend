import type { Order } from "#/domain/entities/order.js";
import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import { Commune } from "#/domain/value-objects/commune.js";
import { DeliveryFees } from "#/domain/value-objects/delivery-fees.js";
import { Money } from "#/domain/value-objects/money.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { Wilaya } from "#/domain/value-objects/wilaya.js";
import {
  HttpConnectionError,
  HttpTimeoutError,
  NotFoundError,
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

    try {
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

  async getActiveCommunesOfWilaya(wilayaCode: number): Promise<Commune[]> {
    this.logger.debug("getActiveCommunesOfWilaya called");

    const searchParams = new URLSearchParams({
      wilaya_id: String(wilayaCode),
    });

    const url = `/get/communes?${searchParams.toString()}`;

    try {
      const reponse = await this.logger.measure(
        `httpClient.request(${url})`,
        () =>
          this.httpClient.request<WEGetCommunesResBody>({
            url,
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }),
      );

      if (!this.isSuccess(reponse.statusCode)) {
        throw new WorldExpressApiError(reponse.statusCode, reponse.body, url);
      }

      this.logger.debug("getActiveCommunesOfWilaya completed", {
        communesCount: reponse.body.length,
      });

      return reponse.body.map(
        (commune) =>
          new Commune(
            commune.nom,
            wilayaCode,
            commune.code_postal,
            commune.has_stop_desk === 1,
          ),
      );
    } catch (error) {
      this.logger.error("getActiveCommunesOfWilaya failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }

      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.getActiveCommunesOfWilaya",
      );
    }
  }

  async getActiveWilayas(): Promise<Wilaya[]> {
    this.logger.debug("getActiveWilayas called");

    const url = `${this.baseUrl}/get/wilayas`;

    try {
      const response = await this.logger.measure(
        `httpClient.request(${url})`,
        () =>
          this.httpClient.request<WEGetWilayasResBody>({
            url,
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }),
      );

      if (!this.isSuccess(response.statusCode)) {
        throw new WorldExpressApiError(response.statusCode, response.body, url);
      }

      this.logger.debug("getActiveWilayas completed", {
        wilayasCount: response.body.length,
      });

      return response.body.map(
        (wilaya) => new Wilaya(wilaya.wilaya_id, wilaya.wilaya_name),
      );
    } catch (error) {
      this.logger.error("getActiveWilayas failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }

      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.getActiveWilayas",
      );
    }
  }

  async activateShipment(
    trackingNumber: string,
  ): Promise<{ success: boolean }> {
    this.logger.debug("activateShipment called");

    const searchParams = new URLSearchParams({
      tracking: trackingNumber,
      ask_collection: "0",
    });

    const url = `${this.baseUrl}/valid/order?${searchParams.toString()}`;

    try {
      const response = await this.logger.measure(
        `httpClient.request(${url})`,
        () =>
          this.httpClient.request<WEActivateShipmentResBody>({
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

      this.logger.debug("activateShipment completed", {
        success: response.body.success,
        message: response.body.message,
      });

      return { success: response.body.success };
    } catch (error) {
      this.logger.error("activateShipment failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }

      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.activateShipment",
      );
    }
  }

  async deleteUnshippedShipment(
    trackingNumber: string,
  ): Promise<{ success: boolean }> {
    this.logger.debug("deleteUnshippedShipment called");

    const searchParams = new URLSearchParams({
      tracking: trackingNumber,
    });

    const url = `${this.baseUrl}/delete/order?${searchParams.toString()}`;

    try {
      const response = await this.logger.measure(
        `httpClient.request(${url})`,
        () =>
          this.httpClient.request<WEDeleteUnshippedShipmentResBody>({
            url,
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }),
      );

      if (!this.isSuccess(response.statusCode)) {
        throw new WorldExpressApiError(response.statusCode, response.body, url);
      }

      this.logger.debug("deleteUnshippedShipment completed", {
        success: response.body.delete === "success",
      });

      return { success: response.body.delete === "success" };
    } catch (error) {
      this.logger.error("deleteUnshippedShipment failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }

      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.deleteUnshippedShipment",
      );
    }
  }

  async getDeliveryFeesOfWilaya(wilayaId: number): Promise<DeliveryFees> {
    this.logger.debug("getDeliveryFeesOfWilaya called");

    const url = `${this.baseUrl}/get/fees`;

    try {
      const response = await this.logger.measure(
        `httpClient.request(${url})`,
        () =>
          this.httpClient.request<WEGetDeliveryFeesResBody>({
            url,
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }),
      );

      if (!this.isSuccess(response.statusCode)) {
        throw new WorldExpressApiError(response.statusCode, response.body, url);
      }

      const targetWilaya = response.body.livraison.find(
        (livraison) => livraison.wilaya_id === wilayaId,
      );

      if (!targetWilaya) {
        throw new NotFoundError("Wilaya", String(wilayaId));
      }

      const fees: DeliveryFees = new DeliveryFees(
        Money.of(Number(targetWilaya.tarif), "DZD"),
        Money.of(Number(targetWilaya.tarif_stopdesk), "DZD"),
      );

      this.logger.debug("getDeliveryFeesOfWilaya completed", {
        wilayaId,
      });

      return fees
    } catch (error) {
      this.logger.error("getDeliveryFeesOfWilaya failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }

      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.getDeliveryFeesOfWilaya",
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

type WEGetCommunesResBody = {
  nom: string;
  wilaya_id: number;
  code_postal: string;
  has_stop_desk: 1 | 0;
}[];

type WEGetWilayasResBody = {
  wilaya_id: number;
  wilaya_name: string;
}[];

type WEActivateShipmentResBody = {
  success: boolean;
  message: string;
};

type WEDeleteUnshippedShipmentResBody = {
  delete: "success" | "fail";
};

type WEWilayaFees = {
  wilaya_id: number;
  tarif: string;
  tarif_stopdesk: string;
};

type WEGetDeliveryFeesResBody = {
  livraison: WEWilayaFees[];
  pickup: WEWilayaFees[];
  echange: WEWilayaFees[];
  recouvrement: WEWilayaFees[];
  retours: WEWilayaFees[];
};
