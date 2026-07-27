import type { Order, OrderStatus } from "#/domain/entities/order.js";
import type {
  ShippingLabel,
  ShippingProviderGateway,
} from "#/domain/gateways/shipping-provider.gateway.js";
import { Commune } from "#/domain/value-objects/commune.js";
import { DeliveryFees } from "#/domain/value-objects/delivery-fees.js";
import { Money } from "#/domain/value-objects/money.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import {
  OrderTrackingStatus,
  TrackingHistory,
} from "#/domain/value-objects/tracking-history.js";
import { Wilaya } from "#/domain/value-objects/wilaya.js";
import {
  BadRequestError,
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
        fees: {
          homeDeliveryFee: fees.homeDeliveryFee.toSnapshot(),
          stopDeskFee: fees.stopDeskFee.toSnapshot(),
        },
      });

      return fees;
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

  async getManyShipmentsStatuses(
    trackingNumbers: string[],
  ): Promise<{ trackingNumber: string; status: OrderStatus }[]> {
    this.logger.debug("getManyShipmentsStatuses called");

    const searchParams = new URLSearchParams({
      api_token: this.apiKey,
      status: "all",
    });
    searchParams.append("trackings", trackingNumbers.join(","));

    const url = `${this.baseUrl}/get/orders?${searchParams.toString()}`;

    try {
      const response = await this.logger.measure(
        `httpClient.request(${url})`,
        () =>
          this.httpClient.request<WEGetManyShipmentsStatusesResBody>({
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

      const formattedResult: {
        trackingNumber: string;
        status: OrderStatus;
      }[] = [];

      for (const [trackingNumber, order] of Object.entries(
        response.body.data,
      )) {
        const status = this.translateWEStatusToOrderStatus(order.status);

        formattedResult.push({
          status: status,
          trackingNumber,
        });
      }

      this.logger.debug("getManyShipmentsStatuses completed", {
        trackingNumbers,
      });

      return formattedResult;
    } catch (error) {
      this.logger.error("getManyShipmentsStatuses failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }

      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.getManyShipmentsStatuses",
      );
    }
  }

  async getOneShipmentStatus(
    trackingNumber: string,
  ): Promise<{ status: OrderStatus }> {
    this.logger.debug("getOneShipmentStatus called");

    try {
      const shipmentStatuses = await this.getManyShipmentsStatuses([
        trackingNumber,
      ]);

      const status = shipmentStatuses[0]?.status;

      if (!status) {
        throw new NotFoundError("Shipment", trackingNumber);
      }

      this.logger.debug("getOneShipmentStatus completed", {
        trackingNumber,
      });

      return { status };
    } catch (error) {
      this.logger.error("getOneShipmentStatus failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }

      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.getOneShipmentStatus",
      );
    }
  }

  async getTrackingHistoryOfShipment(
    trackingNumber: string,
  ): Promise<TrackingHistory[]> {
    this.logger.debug("getTrackingHistoryOfShipment called");

    const searchParams = new URLSearchParams({
      tracking: trackingNumber,
    });

    const url = `${this.baseUrl}/get/tracking/info?${searchParams.toString()}`;

    try {
      const response = await this.logger.measure(
        `httpClient.request(${url})`,
        () =>
          this.httpClient.request<WEGetTrackingHistoryOfShipmentResBody>({
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

      const trackingHistory: TrackingHistory[] = response.body.activity.map(
        (a) =>
          new TrackingHistory(
            new Date(a.date),
            a.time,
            this.translateWETrackingStatustoOrderTrackingStatus(a.status),
            a.station,
          ),
      );

      this.logger.debug("getTrackingHistoryOfShipment completed", {
        trackingNumber,
      });

      return trackingHistory;
    } catch (error) {
      this.logger.error("getTrackingHistoryOfShipment failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }

      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.getTrackingHistoryOfShipment",
      );
    }
  }

  async updateUnShippedShipment(order: Order): Promise<{ success: boolean }> {
    this.logger.debug("updateUnShippedShipment called");

    const trackingNumber = order.getTrackingNumber();
    if (!trackingNumber) {
      throw new BadRequestError(
        "a tracking number is required before you can update the order in the shipping provider",
      );
    }

    const searchParams = new URLSearchParams({
      tracking: trackingNumber,
      reference: order.id.value,
      client: order.getShippingDetails().getFullName(),
      tel: order.getShippingDetails().getFirstPhone(),
      tel2: order.getShippingDetails().getSecondPhone() ?? "",
      adresse: order.getShippingDetails().getAddress(),
      code_postal: order.getShippingDetails().getPostalCode(),
      commune: order.getShippingDetails().getCommune(),
      wilaya: String(order.getShippingDetails().getWilayaCode()),
      remarque: order.getShippingDetails().getClientNote() ?? "",
      fragile: order.getShippingDetails().getFragile() ? "1" : "0",
      gps_link: order.getShippingDetails().getGpsLink() ?? "",
      montant: String(order.getTotalOrderPrice().amount),
      type: "1", // "delivery"
    });

    const url = `${this.baseUrl}/update/order?${searchParams.toString()}`;

    try {
      const response = await this.logger.measure(
        `httpClient.request(${url})`,
        () =>
          this.httpClient.request<{ success: boolean }>({
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

      this.logger.debug("updateUnShippedShipment completed", {
        trackingNumber,
      });

      return response.body;
    } catch (error) {
      this.logger.error("updateUnShippedShipment failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }
      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.updateUnShippedShipment",
      );
    }
  }

  async getShippingLabel(trackingNumber: string): Promise<ShippingLabel> {
    this.logger.debug("getShippingLabel called");

    const searchParams = new URLSearchParams({
      tracking: trackingNumber,
    });

    const url = `${this.baseUrl}/get/order/label?${searchParams.toString()}`;

    try {
      const response = await this.logger.measure(
        `httpClient.request(${url})`,
        () =>
          this.httpClient.requestBinary({
            url,
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              Accept: "application/pdf",
            },
          }),
      );

      if (!this.isSuccess(response.statusCode)) {
        throw new WorldExpressApiError(response.statusCode, {}, url);
      }

      this.logger.debug("getShippingLabel completed", { trackingNumber });

      return {
        contentType: response.contentType,
        buffer: response.buffer,
        filename: response.filename,
      };
    } catch (error) {
      this.logger.error("getShippingLabel failed", error as Error);

      if (
        error instanceof HttpTimeoutError ||
        error instanceof HttpConnectionError
      ) {
        throw error;
      }
      handleWorldExpressErrors(
        error,
        "WorldExpressShippingProviderGateway.getShippingLabel",
      );
    }
  }

  private translateWETrackingStatustoOrderTrackingStatus(
    status: WETrackingStatus,
  ): OrderTrackingStatus {
    switch (status) {
      case "order_information_received_by_carrier":
        return OrderTrackingStatus.ORDER_INFORMATION_RECEIVED_BY_CARRIER;
      case "picked":
        return OrderTrackingStatus.PICKED;
      case "accepted_by_carrier":
        return OrderTrackingStatus.ATTEMPT_DELIVERY;
      case "dispatched_to_driver":
        return OrderTrackingStatus.DISPATCHED_TO_DRIVER;
      case "attempt_delivery":
        return OrderTrackingStatus.ATTEMPT_DELIVERY;
      case "return_asked":
        return OrderTrackingStatus.RETURN_ASKED;
      case "return_in_transit":
        return OrderTrackingStatus.RETURN_IN_TRANSIT;
      case "Return_received":
        return OrderTrackingStatus.RETURN_RECEIVED;
      case "livred":
        return OrderTrackingStatus.DELIVERED;
      case "encaissed":
        return OrderTrackingStatus.DELIVERED;
      case "payed":
        return OrderTrackingStatus.PAID;
      default:
        return OrderTrackingStatus.ATTEMPT_DELIVERY;
    }
  }

  private translateWEStatusToOrderStatus(
    status: WEShipmentStatus,
  ): OrderStatus {
    switch (status) {
      case "prete_a_expedier":
        return "SHIPPING";

      case "en_ramassage":
        return "SHIPPING";

      case "en_preparation_stock":
        return "SHIPPING";

      case "vers_hub":
        return "SHIPPING";

      case "en_hub":
        return "SHIPPING";

      case "vers_wilaya":
        return "SHIPPING";

      case "en_preparation":
        return "SHIPPING";

      case "en_livraison":
        return "SHIPPING";

      case "suspendu":
        return "SUSPENDED";

      case "livre_non_encaisse":
        return "DELIVERED";

      case "encaisse_non_paye":
        return "DELIVERED";

      case "paiements_prets":
        return "DELIVERED";

      case "paye_et_archive":
        return "DELIVERED";

      case "retour_chez_livreur":
        return "RETURNED";

      case "retour_transit_entrepot":
        return "RETURNED";

      case "retour_en_traitement":
        return "RETURNED";

      case "retour_recu":
        return "RETURNED";

      case "retour_archive":
        return "RETURNED";

      case "annule":
        return "CANCELLED";

      default:
        return "SHIPPING";
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

type WEStatusActivity = {
  reason: string;
  details: string;
  station: string;
  driver: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  postponed_to: string | null;
};

type WEShipmentStatusCore = {
  status: WEShipmentStatus;
  order_id: string;
  activity: WEStatusActivity[];
};

type WEShipmentStatusExtras = {
  desk_phone?: string;
  desk_commune?: string;
  desk_map_link?: string;
  desk_address?: string;
  driver_phone?: string;
  estimated_fee?: number;
};

type WEShipmentStatusPayload = WEShipmentStatusCore & WEShipmentStatusExtras;

type WEGetManyShipmentsStatusesResBody = {
  data: Record<string, WEShipmentStatusPayload>;
};

type WEActivity = {
  date: string; // ISO date string
  time: string; // HH:mm:ss
  status: WETrackingStatus; // carrier-defined enum (string for now)
  scanLocation?: string;
  station?: string;
};

type WEShipmentBase = {
  recipientName: string;
  shippedBy: string;
  originCity: number;
  destLocationCity: number;
  activity: WEActivity[];
};

type WEShipmentWithStation = WEShipmentBase & {
  currentStation: string;
  reasons: string[];
};

type WEShipmentWithoutStation = WEShipmentBase & {
  currentStation?: never;
  reasons?: never;
};

type WEGetTrackingHistoryOfShipmentResBody =
  | WEShipmentWithStation
  | WEShipmentWithoutStation;

export type WEShipmentStatus =
  | "prete_a_expedier"
  | "en_ramassage"
  | "en_preparation_stock"
  | "vers_hub"
  | "en_hub"
  | "vers_wilaya"
  | "en_preparation"
  | "en_livraison"
  | "suspendu"
  | "livre_non_encaisse"
  | "encaisse_non_paye"
  | "paiements_prets"
  | "paye_et_archive"
  | "retour_chez_livreur"
  | "retour_transit_entrepot"
  | "retour_en_traitement"
  | "retour_recu"
  | "retour_archive"
  | "annule"
  | "all";

export type WETrackingStatus =
  | "order_information_received_by_carrier"
  | "picked"
  | "accepted_by_carrier"
  | "dispatched_to_driver"
  | "attempt_delivery"
  | "return_asked"
  | "return_in_transit"
  | "Return_received"
  | "livred"
  | "encaissed"
  | "payed";
