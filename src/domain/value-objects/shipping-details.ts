import type { ShippingDetailsDTO } from "#/domain/entities-snapshots/shipping-details.dto.js";

export const DeliveryType = {
  TO_DESK: "TO_DESK",
  TO_HOME: "TO_HOME",
} as const;

export type DeliveryType = (typeof DeliveryType)[keyof typeof DeliveryType];

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
    private _clientNote: string | null,
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

  // command methods

  updateAddress(newAddress: string): void {
    this._address = newAddress;
  }

  updateFirstPhone(newFirstPhone: string): void {
    this._firstPhone = newFirstPhone;
  }

  updateSecondPhone(newSecondPhone: string | null): void {
    this._secondPhone = newSecondPhone;
  }

  updateClientName(newClientName: string): void {
    this._fullName = newClientName;
  }

  updateClientNote(newClientNote: string | null): void {
    this._clientNote = newClientNote;
  }

  updateIsFragile(isFragile: boolean): void {
    this._fragile = isFragile;
  }

  updateGpsLink(newGpsLink: string | null): void {
    this._gpsLink = newGpsLink;
  }

  // query methods

  getFullName(): string {
    return this._fullName;
  }

  getFirstPhone(): string {
    return this._firstPhone;
  }

  getSecondPhone(): string | null {
    return this._secondPhone;
  }

  getAddress(): string {
    return this._address;
  }

  getGpsLink(): string | null {
    return this._gpsLink;
  }

  getClientNote(): string | null {
    return this._clientNote;
  }

  getFragile(): boolean {
    return this._fragile;
  }

  getWilayaCode(): number {
    return this.wilayaCode;
  }

  getCommune(): string {
    return this.commune;
  }

  getPostalCode(): string {
    return this.postalCode;
  }

  toSnapshot(): ShippingDetailsDTO {
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
