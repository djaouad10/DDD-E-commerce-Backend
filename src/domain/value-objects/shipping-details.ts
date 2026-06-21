import type { ShippingDetailsDTO } from "#/application/dto/shipping-details.dto.js";

export type DeliveryType = "TO_DESK" | "TO_HOME";

export class ShippingDetails {
  // it has no unique id
  private constructor(
    readonly deliveryType: DeliveryType,
    private _fullName: string,
    private _firstPhone: string,
    private _secondPhone: string | null,
    private readonly wilayaCode: number,
    private readonly commune: string,
    private readonly postalCode: string,
    private _address: string,
    private _gpsLink: string | null,
    readonly _clientNote: string | null,
    private _fragile: boolean,
  ) {}

  static create(
    deliveryType: DeliveryType,
    fullName: string,
    firstPhone: string,
    wilayaCode: number,
    commune: string,
    postalCode: string,
    address: string,
    fragile: boolean,
    secondPhone?: string,
    gpsLink?: string,
    clientNote?: string,
  ): ShippingDetails {
    // validation here then:
    return new ShippingDetails(
      deliveryType,
      fullName,
      firstPhone,
      secondPhone ?? null,
      wilayaCode,
      commune,
      postalCode,
      address,
      gpsLink ?? null,
      clientNote ?? null,
      fragile,
    );
  }

  static reconstitute(
    deliveryType: DeliveryType,
    fullName: string,
    firstPhone: string,
    wilayaCode: number,
    commune: string,
    postalCode: string,
    address: string,
    fragile: boolean,
    secondPhone?: string,
    gpsLink?: string,
    clientNote?: string,
  ): ShippingDetails {
    // no validation needed, we trust the DB
    return new ShippingDetails(
      deliveryType,
      fullName,
      firstPhone,
      secondPhone ?? null,
      wilayaCode,
      commune,
      postalCode,
      address,
      gpsLink ?? null,
      clientNote ?? null,
      fragile,
    );
  }

  toDTO(): ShippingDetailsDTO {
    return {
      deliveryType: this.deliveryType,
      fullName: this._fullName,
      firstPhone: this._firstPhone,
      secondPhone: this._secondPhone,
      wilayaCode: this.wilayaCode,
      commune: this.commune,
      postalCode: this.postalCode,
      address: this._address,
      gpsLink: this._gpsLink,
      clientNote: this._clientNote,
      fragile: this._fragile,
    };
  }
}
