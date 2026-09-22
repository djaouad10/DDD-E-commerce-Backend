export function generateProductEmbeddingId() {
  const uuid = crypto.randomUUID();

  const cleanUuid = uuid.replace(/-/g, "");

  // 8 + 32 = 40 (id max length in db)
  return `prdembd_${cleanUuid}`;
}
