import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("migrate: no DATABASE_URL set, skipping");
  process.exit(0);
}

const client = new pg.Client({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("migrate: schema is up to date");
} catch (err) {
  console.error("migrate: failed", err.message);
  process.exit(1);
} finally {
  await client.end();
}
