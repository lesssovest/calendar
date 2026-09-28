import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | undefined;

function createNeonClient() {
  const databaseUrl = process.env["NEON_DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("Missing NEON_DATABASE_URL environment variable.");
  }
  return neon(databaseUrl);
}

export const sql = new Proxy({} as ReturnType<typeof neon>, {
  get(_, prop, receiver) {
    if (!_sql) _sql = createNeonClient();
    return Reflect.get(_sql, prop, receiver);
  },
});
