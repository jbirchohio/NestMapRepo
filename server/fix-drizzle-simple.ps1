# Simple targeted fix for remaining Drizzle import issues
Write-Host "🔄 Fixing Drizzle imports..." -ForegroundColor Yellow

# Get all TypeScript files
$files = Get-ChildItem -Path "src" -Filter "*.ts" -Recurse

$fixedCount = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        $originalContent = $content
        
        # Fix the main problematic patterns
        $content = $content -replace "from\s+'drizzle-orm/expressions'", "from 'drizzle-orm'"
        $content = $content -replace "from\s+`"drizzle-orm/expressions`"", "from 'drizzle-orm'"
        
        # Consolidate split imports on same line
        $content = $content -replace "}\s*from\s+'drizzle-orm';\s*import\s*\{", ", "
        
        if ($content -ne $originalContent) {
            Set-Content $file.FullName $content -NoNewline
            $fixedCount++
            Write-Host "✅ Fixed: $($file.Name)" -ForegroundColor Green
        }
    }
}

Write-Host "🎯 Fixed $fixedCount files" -ForegroundColor Cyan
