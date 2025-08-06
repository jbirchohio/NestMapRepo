@echo off
echo Pushing schema to Railway database...
set DATABASE_URL=postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway
npm run db:push
echo Done!