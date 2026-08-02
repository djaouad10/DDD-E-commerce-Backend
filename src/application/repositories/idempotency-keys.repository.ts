export type IdempotencyKeysRepository = {
  create(id: string, handlerName: string): Promise<void>;
};
