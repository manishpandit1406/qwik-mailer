import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { inboundParse } from "./schema";

const connectionString = process.env.DATABASE_URL!;

const queryClient = postgres(connectionString, { max: 20 });
export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
export { inboundParse };
export * from "./schema";
