type UpdateProductMainImageData = {
  key: string;
  name: string;
  publicUrl: string;
};

export class UpdateProductMainImageCommand {
  constructor(
    public readonly productId: string,
    public readonly data: UpdateProductMainImageData,
  ) {}
}
