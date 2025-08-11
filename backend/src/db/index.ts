import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Database connection singleton
export const createDrizzleConnection = (config: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean | object; // Add SSL option
}) => {
  const pool = new Pool(config);
  return drizzle(pool, { schema });
};
