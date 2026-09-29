import { neon } from "@neondatabase/serverless";

type NeonSql = ReturnType<typeof neon>;

let client: NeonSql | undefined;

function getClient(): NeonSql {
  if (!client) {
    const databaseUrl = process.env["NEON_DATABASE_URL"];
    if (!databaseUrl) {
      throw new Error("Missing NEON_DATABASE_URL environment variable.");
    }
    client = neon(databaseUrl);
  }
  return client;
}

export const sql = ((...args: Parameters<NeonSql>) => {
  return getClient()(...args);
}) as NeonSql;
