export function generateProductEmbeddingId() {
  const uuid = crypto.randomUUID();

  const cleanUuid = uuid.replace(/-/g, "");

  // 8 + 32 = 40 (id max length in db)
  return `prdembd_${cleanUuid}`;
}

export function generateConversationId() {
  const uuid = crypto.randomUUID();

  const cleanUuid = uuid.replace(/-/g, "");

  // 5 + 32 = 37 (id max length in db is 40)
  return `conv_${cleanUuid}`;
}

export function generateConversationMessageId() {
  const uuid = crypto.randomUUID();

  const cleanUuid = uuid.replace(/-/g, "");

  // 8 + 32 = 40 (id max length in db)
  return `convmsg_${cleanUuid}`;
}
