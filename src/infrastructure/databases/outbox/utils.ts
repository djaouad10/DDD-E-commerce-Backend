export function generateOutboxId() {
  const uuid = crypto.randomUUID();

  const cleanUuid = uuid.replace(/-/g, "");

  return `otbx_${cleanUuid}`;
}
