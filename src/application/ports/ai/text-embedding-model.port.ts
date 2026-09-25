export type TextEmbeddingModelPort = {
  // batch embedding by default
  embed(text: string[]): Promise<number[][]>;
}
