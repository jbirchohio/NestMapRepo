# PowerShell script to push schema to Railway database
$env:DATABASE_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway"
Write-Host "Pushing schema to Railway database..." -ForegroundColor Green
npx drizzle-kit push --config=drizzle.config.ts
Write-Host "Done!" -ForegroundColor Green