import type { WeightUnit } from "#/domain/value-objects/weight.js";

export type WeightSnapshot = {
  weight: number;
  unit: WeightUnit;
};
