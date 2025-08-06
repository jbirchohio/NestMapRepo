# Force push all schema changes to Railway
$env:DATABASE_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway"
Write-Host "Force pushing schema to Railway..." -ForegroundColor Green

# Use echo to auto-answer the prompt
echo "1" | npx drizzle-kit push --config=drizzle.config.ts

Write-Host "Schema push complete!" -ForegroundColor Green