export interface ProductChunk {
  index: number;
  content: string;
}

export interface ChunkableProduct {
  name: string;
  categoryName: string | null;
  brand: string;
  material: string;
  description: string | null;
}

// note: prices, colors, sizes, stock. those are filter dimensions handled by the hybrid search, never embedded.

export function chunkProduct(product: ChunkableProduct): ProductChunk[] {
  const chunks: (Omit<ProductChunk, "index"> | null)[] = [
    {
      content: [
        `Product: ${product.name}`,
        product.categoryName ? `Category: ${product.categoryName}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      content: `Brand: ${product.brand}\nMaterial: ${product.material}`,
    },
    product.description
      ? { content: `Description: ${product.description}` }
      : null, // products can exist without a description — never emit an empty chunk
  ];

  return chunks
    .filter((c): c is Omit<ProductChunk, "index"> => c !== null)
    .map((c, index) => ({ ...c, index }));
}
