# Fix Drizzle imports comprehensively after fresh install
# This script handles all the remaining import patterns

Write-Host "🔄 Fixing Drizzle imports across all TypeScript files..." -ForegroundColor Yellow

# Pattern 1: Fix 'drizzle-orm/expressions' imports
$files = Get-ChildItem -Path "src" -Filter "*.ts" -Recurse | ForEach-Object { $_.FullName }

foreach ($file in $files) {
    $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
    if ($content) {
        $originalContent = $content
        
        # Pattern 1: Replace 'drizzle-orm/expressions' with 'drizzle-orm'
        $content = $content -replace "from\s+'drizzle-orm/expressions'", "from 'drizzle-orm'"
        
        # Pattern 2: Consolidate multiple drizzle imports
        # Find lines with drizzle imports
        $lines = $content -split "`n"
        $drizzleImports = @()
        $nonDrizzleLines = @()
        $inImportBlock = $false
        
        foreach ($line in $lines) {
            if ($line -match "^import.*from\s+['""]drizzle-orm['""]") {
                # Extract imported items
                if ($line -match "import\s*\{([^}]+)\}") {
                    $imports = $matches[1] -split "," | ForEach-Object { $_.Trim() }
                    $drizzleImports += $imports
                }
            }
            elseif ($line -match "^import.*from\s+['""]drizzle-orm/sql['""]") {
                # Extract SQL imports
                if ($line -match "import\s*\{([^}]+)\}") {
                    $imports = $matches[1] -split "," | ForEach-Object { $_.Trim() }
                    $drizzleImports += $imports
                }
            }
            elseif ($line -match "^import.*from\s+['""]drizzle-orm/") {
                # Skip other drizzle-orm/* imports for now
                continue
            }
            else {
                $nonDrizzleLines += $line
            }
        }
        
        # If we found drizzle imports, consolidate them
        if ($drizzleImports.Count -gt 0) {
            $uniqueImports = $drizzleImports | Sort-Object -Unique
            $consolidatedImport = "import { " + ($uniqueImports -join ", ") + " } from 'drizzle-orm';"
            
            # Find where to insert the consolidated import (after other imports)
            $insertIndex = 0
            for ($i = 0; $i -lt $nonDrizzleLines.Count; $i++) {
                if ($nonDrizzleLines[$i] -match "^import") {
                    $insertIndex = $i + 1
                }
            }
            
            # Insert the consolidated import
            $newLines = @()
            for ($i = 0; $i -lt $nonDrizzleLines.Count; $i++) {
                $newLines += $nonDrizzleLines[$i]
                if ($i -eq $insertIndex - 1) {
                    $newLines += $consolidatedImport
                }
            }
            
            $newContent = $newLines -join "`n"
            
            if ($newContent -ne $originalContent) {
                Set-Content $file $newContent -NoNewline
                Write-Host "✅ Fixed Drizzle imports in: $($file.Replace((Get-Location).Path, '.'))" -ForegroundColor Green
            }
        }
        else {
            # Simple pattern replacements if no consolidation needed
            if ($content -ne $originalContent) {
                Set-Content $file $content -NoNewline
                Write-Host "✅ Fixed basic Drizzle imports in: $($file.Replace((Get-Location).Path, '.'))" -ForegroundColor Green
            }
        }
    }
}

Write-Host "🎯 Drizzle import fixes completed!" -ForegroundColor Cyan
