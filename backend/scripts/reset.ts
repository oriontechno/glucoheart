import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/db/schema';
import { reset } from "drizzle-seed";
import 'dotenv/config';

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);
  await reset(db, schema);
}

main();
