import type { Category } from "#/domain/entities/category.js";
import type { CategoryRepository } from "#/domain/repositories/category.repository.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { CategoryId } from "#/domain/value-objects/category-id.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { ImageDTO } from "../dto/file.dto.js";
import type { ProductStaticDataDTO } from "../dto/product.dto.js";
import type { VariationDTO } from "../dto/variation.dto.js";
import type { GetProductUpdateDataQuery } from "../queries/get-product-update-data.query.js";

export class GetProductUpdateDataService {
  private logger = createLogger("GetProductUpdateDataService");

  constructor(
    private productRepository: ProductRepository,
    private categoryRepository: CategoryRepository,
  ) {}

  async execute(query: GetProductUpdateDataQuery): Promise<{
    product: ProductStaticDataDTO;
    images: ImageDTO[];
    variations: VariationDTO[];
  }> {
    this.logger.info(`GetProductUpdateDataService.execute called`);

    const product = await this.productRepository.find(ProductId.of(query.id));

    if (!product) throw new NotFoundError("product", query.id);

    let category: Category | null = null;

    const categoryId: CategoryId | null = product.getCategoryId();

    if (categoryId) {
      category = await this.categoryRepository.find(categoryId);
    }

    const productSnapshot = product.toSnapshot();

    return {
      product: {
        id: productSnapshot.id,
        name: productSnapshot.name,
        slug: productSnapshot.slug,
        description: productSnapshot.description,
        brand: productSnapshot.brand,
        material: productSnapshot.material,
        price: productSnapshot.price,
        discountedPrice: productSnapshot.discountedPrice,
        category: category?.toSnapshot() ?? null,
        averageRating: productSnapshot.averageRating,
        mainImage: {
          name: product.getMainImage().getName(),
          url: product.getMainImage().publicUrl,
        },
        createdAt: productSnapshot.id,
        updatedAt: productSnapshot.id,
      },
      images: product.getImages().map((i) => ({
        name: i.getName(),
        url: i.publicUrl,
      })),
      variations: product.getVariations().map((v) => v.toSnapshot()),
    };
  }
}
