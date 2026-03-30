import { env } from "@hitachi2/env/server";
import { PgBoss } from "pg-boss";

export const boss = new PgBoss(env.DATABASE_URL);
