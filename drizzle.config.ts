
import { defineConfig } from "drizzle-kit";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_DB_PASSWORD) {
  throw new Error("SUPABASE_URL and SUPABASE_DB_PASSWORD are required for database migrations");
}

// Extract database URL from Supabase
const supabaseUrl = new URL(process.env.SUPABASE_URL);
const databaseUrl = `postgresql://postgres.${supabaseUrl.hostname.split('.')[0]}:${process.env.SUPABASE_DB_PASSWORD}@${supabaseUrl.hostname}:5432/postgres`;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
