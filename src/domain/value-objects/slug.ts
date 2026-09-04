import { ValidationError } from "#/shared/errors/domain-error.js";

export class Slug {
  private constructor(readonly value: string) {}

  static generate(productName: string): Slug {
    const base = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const hash = Math.random().toString(36).substring(2, 7).toUpperCase();

    return new Slug(`${base}-${hash}`);
  }

  // build from an existing value
  static of(value: string): Slug {
    // validation
    if (!/^[a-z0-9]+(-[a-z0-9]+)*-[A-Z0-9]{5}$/.test(value)) {
      throw new ValidationError("Slug.value", "invalid slug value format");
    }
    return new Slug(value);
  }
}
