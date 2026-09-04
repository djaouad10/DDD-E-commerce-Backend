import {
  BadRequestError,
  ValidationError,
} from "#/shared/errors/domain-error.js";

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
    this.validate();
  }

  private validate() {
    if (
      this.data.price === undefined &&
      this.data.discountPrice === undefined &&
      this.data.name === undefined &&
      this.data.description === undefined &&
      this.data.brand === undefined &&
      this.data.material === undefined &&
      this.data.categoryId === undefined
    )
      throw new BadRequestError(
        "provide at least one field to update in product",
        { productId: this.productId },
      );

    if (
      this.data.price &&
      this.data.discountPrice &&
      this.data.price <= this.data.discountPrice
    )
      throw new ValidationError(
        "product.discountPrice",
        "discount price must be less than price",
      );
  }
}
