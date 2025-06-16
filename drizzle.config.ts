import { defineConfig } from "drizzle-kit";

let databaseUrl: string;

if (process.env.TEST_DATABASE_URL) {
  // Use local test database
  databaseUrl = process.env.TEST_DATABASE_URL;
} else {
  // Require Supabase creds only if not testing
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error("SUPABASE_URL and SUPABASE_DB_PASSWORD are required for database migrations");
  }

  const supabaseUrl = new URL(process.env.SUPABASE_URL);
  const host = supabaseUrl.hostname;
  const projectId = host.split('.')[0];
  databaseUrl = `postgresql://postgres.${projectId}:${process.env.SUPABASE_DB_PASSWORD}@${host}:5432/postgres`;
}

export default defineConfig({
  schema: "./server/db/schema.ts",  // or ./shared/schema.ts
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
