import { vi } from "vitest";
import type { TextEmbeddingModelPort } from "#/application/ports/ai/text-embedding-model.port.js";

// FNV-1a — tiny, fast, deterministic string hash (same output on every machine/run)
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Deterministic text -> vector(dims). Feature hashing: each token lands in a
 * bucket and increments it; bigrams get their own buckets so phrase overlap
 * matters too. Cosine-compatible: plain finite numbers, exact length, and
 * magnitude is irrelevant to the <=> operator.
 * Exported so tests can compute the expected vector for a known string.
 */
export function hashEmbedding(text: string, dimensions = 768): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const bucket = fnv1a(token) % dimensions;
    vector[bucket] = (vector[bucket] ?? 0) + 1;
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    const bucket = fnv1a(`${tokens[i]} ${tokens[i + 1]}`) % dimensions;
    vector[bucket] = (vector[bucket] ?? 0) + 1;
  }

  // cosine against the zero vector is undefined (NaN in pgvector) — never emit one
  if (tokens.length === 0) vector[0] = 1e-6;

  return vector;
}

export function createFakeTextEmbeddingModel(dimensions = 768) {
  const model = {
    embed: vi.fn(
      async (texts: string[]): Promise<number[][]> =>
        texts.map((text) => hashEmbedding(text, dimensions)),
    ),
  } satisfies TextEmbeddingModelPort;

  return model;
}

export type FakeTextEmbeddingModel = ReturnType<
  typeof createFakeTextEmbeddingModel
>;
