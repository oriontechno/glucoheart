import { Pool } from 'pg';
import * as schema from './schema';
export declare const createDrizzleConnection: (config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    ssl: boolean | object;
}) => import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: import("drizzle-orm/node-postgres").NodePgClient extends TClient ? Pool : TClient;
};
