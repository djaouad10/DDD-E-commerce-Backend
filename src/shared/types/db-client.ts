import type { TransactionClient } from "./transaction-client.js";

export type DBClient = {
  transaction<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T>;
};

