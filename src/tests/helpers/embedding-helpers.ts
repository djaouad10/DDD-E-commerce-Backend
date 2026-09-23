import { chunkProduct } from "#/application/ai/product-chunker.js";
import type { Container } from "#/composition/utils/container.js";
import {
  DRIZZLE_DB,
  PRODUCT_EMBEDDING_REPOSITORY,
  TEXT_EMBEDDING_MODEL_PORT,
} from "#/composition/utils/tokens.js";
import type { Category } from "#/domain/entities/category.js";
import type { Product } from "#/domain/entities/product.js";
import { productEmbeddings } from "#/infrastructure/databases/schema.js";
import { eq } from "drizzle-orm";

export async function embedAndSaveProductChunksInDB(
  container: Container,
  product: Product,
  category: Category,
) {
  const embeddingModel = container.resolveSingleton(TEXT_EMBEDDING_MODEL_PORT);
  const db = container.resolveSingleton(DRIZZLE_DB);
  const productEmbeddingRepository = container.resolveSingleton(
    PRODUCT_EMBEDDING_REPOSITORY,
  );

  const chunks = chunkProduct({
    name: product.getName(),
    brand: product.getBrand(),
    categoryName: category.getName(),
    description: product.getDescription(),
    material: product.getMaterial(),
  });

  const embeddings = await embeddingModel.embed(chunks.map((c) => c.content));

  const batch = chunks.map((chunk, index) => ({
    chunkIndex: chunk.index,
    content: chunk.content,
    embedding: embeddings[index]!,
  }));

  await db.transaction(async (tx) => {
    await productEmbeddingRepository.upsert(
      {
        productId: product.id.value,
        batch,
      },
      tx,
    );
  });
}

export async function getChunksOfProduct(
  container: Container,
  productId: string,
) {
  const db = container.resolveSingleton(DRIZZLE_DB);

  return await db.query.productEmbeddings.findMany({
    where: eq(productEmbeddings.product_id, productId),
  });
}
