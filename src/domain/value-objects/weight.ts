import type { WeightDTO } from "#/application/dto/weight.dto.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

// add more units here in the future
export type WeightUnit = "kg" | "g";

export class Weight {
  private constructor(
    readonly weight: number,
    readonly unit: WeightUnit,
  ) {}

  static of(weight: number, unit: WeightUnit): Weight {
    if (weight < 0)
      throw new ValidationError("weight", "weight can not be negative");

    return new Weight(weight, unit);
  }

  add(other: Weight): Weight {
    if (this.unit !== other.unit)
      throw new ValidationError("units", "weight units must be the same");

    return new Weight(this.weight + other.weight, this.unit);
  }

  multiply(qty: number): Weight {
    return new Weight(this.weight * qty, this.unit);
  }

  toDTO(): WeightDTO {
    return { weight: this.weight, unit: this.unit };
  }
}
