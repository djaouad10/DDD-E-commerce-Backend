import type { WeightUnit } from "#/domain/value-objects/weight.js";

export type WeightDTO = {
  weight: number;
  unit: WeightUnit;
};
