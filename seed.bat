@echo off
set DATABASE_URL=postgresql://neondb_owner:npg_heyosY71KqiV@ep-lingering-pine-aez2izws-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
set SESSION_SECRET=demo-session-secret-for-development-only-12345
set JWT_SECRET=demo-jwt-secret-for-development-only-67890
npx tsx scripts/seed-demo-data.ts