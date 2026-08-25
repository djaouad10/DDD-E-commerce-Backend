import { BadRequestError } from "#/shared/errors/domain-error.js";

type UpdateProductCommandData = {
  price?: number;
  name?: string;
  description?: string | null;
  brand?: string;
  material?: string;
  discountPrice?: number | null;
  categoryId?: string | null;
};

export class UpdateProductCommand {
  constructor(
    public readonly productId: string,
    public readonly data: UpdateProductCommandData,
  ) {
    this.validate(data);
  }

  private validate(data: UpdateProductCommandData) {
    if (
      data.price === undefined &&
      data.discountPrice === undefined &&
      data.name === undefined &&
      data.description === undefined &&
      data.brand === undefined &&
      data.material === undefined &&
      data.categoryId === undefined
    )
      throw new BadRequestError(
        "provide at least one field to update in product",
        { productId: this.productId },
      );

    if (data.price && data.discountPrice && data.price <= data.discountPrice)
      throw new BadRequestError("discount price must be less than price", {
        productId: this.productId,
      });
  }
}
