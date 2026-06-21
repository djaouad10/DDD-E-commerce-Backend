export const Size = {
  XS: "XS",
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  XXL: "XXL",
  XXXL: "XXXL",
  EU_36: "EU_36",
  EU_37: "EU_37",
  EU_38: "EU_38",
  EU_39: "EU_39",
  EU_40: "EU_40",
  EU_41: "EU_41",
  EU_42: "EU_42",
  EU_4: "EU_43",
} as const;

export type Size = (typeof Size)[keyof typeof Size];

export const Color = {
  BLACK: "BLACK",
  WHITE: "WHITE",
  GRAY: "GRAY",
  RED: "RED",
  BLUE: "BLUE",
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  ORANGE: "ORANGE",
  PURPLE: "PURPLE",
  PINK: "PINK",
  BROWN: "BROWN",
  BEIGE: "BEIGE",
  NAVY: "NAVY",
  MAROON: "MAROON",
  TEAL: "TEAL",
} as const;

export type Color = (typeof Color)[keyof typeof Color];
