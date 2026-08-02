export interface IdempotencyKeysRepository {
  create(id: string, handlerName: string): Promise<void>;
}
