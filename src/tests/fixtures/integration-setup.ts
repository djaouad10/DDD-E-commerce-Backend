import postgres from "postgres";

const mainDbUrl = process.env.DATABASE_URL;
if (!mainDbUrl) throw new Error("DATABASE_URL not set");

const templateDbName = new URL(mainDbUrl).pathname.slice(1);
const workerId = process.env.VITEST_WORKER_ID || "0";
const workerDbName = `test_worker_${workerId}`;

process.env.REDIS_DB = String(Number(workerId) % 16); // stay within default 16 DBs

const initWorkerDb = async () => {
  // Connect to the "postgres" maintenance DB, NOT the template DB,
  // so this worker's own connection never counts as a session on
  // the template and blocks CREATE DATABASE ... TEMPLATE.
  const adminUrl = new URL(mainDbUrl);
  adminUrl.pathname = "/postgres";
  const sql = postgres(adminUrl.toString(), { max: 1 });

  await sql`DROP DATABASE IF EXISTS ${sql(workerDbName)} WITH (FORCE);`;
  await sql`CREATE DATABASE ${sql(workerDbName)} TEMPLATE ${sql(templateDbName)};`;

  await sql.end();

  const workerUrl = new URL(mainDbUrl);
  workerUrl.pathname = `/${workerDbName}`;
  process.env.DATABASE_URL = workerUrl.toString();
};

await initWorkerDb();
