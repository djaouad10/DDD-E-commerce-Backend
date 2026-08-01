import type { WeightSnapshot } from "#/domain/entities-snapshots/weight.snapshot.js";
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
    if (qty < 0) throw new ValidationError("qty", "qty can not be negative");
    return new Weight(this.weight * qty, this.unit);
  }

  toKg(): Weight {
    if (this.unit === "kg")
      throw new ValidationError("units", "weight is already in kg");
    const weightInKg = Math.round((this.weight / 1000) * 100) / 100;
    return new Weight(weightInKg, "kg");
  }

  toSnapshot(): WeightSnapshot {
    return { weight: this.weight, unit: this.unit };
  }
}
