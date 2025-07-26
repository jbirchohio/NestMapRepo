# Final Drizzle ORM import fixer - keep everything from main drizzle-orm except sql
$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Fix imports from drizzle-orm/expressions back to drizzle-orm
    if ($content -match 'from [''"]drizzle-orm/expressions[''"]') {
        Write-Host "Fixing expressions import in: $($file.FullName)"
        $content = $content -replace 'from [''"]drizzle-orm/expressions[''"]', 'from ''drizzle-orm'''
    }
    
    # Ensure sql is imported from drizzle-orm/sql if used
    if ($content -match '\bsql\b' -and $content -match 'from [''"]drizzle-orm[''"]' -and $content -notmatch 'from [''"]drizzle-orm/sql[''"]') {
        # Extract sql from main drizzle-orm import and add separate sql import
        $importPattern = 'import\s*\{\s*([^}]+)\s*\}\s*from\s*[''"]drizzle-orm[''"];?'
        if ($content -match $importPattern) {
            $imports = $matches[1]
            $importsList = $imports -split ',' | ForEach-Object { $_.Trim() }
            
            $nonSqlImports = @()
            $sqlImports = @()
            
            foreach ($import in $importsList) {
                if ($import -eq 'sql') {
                    $sqlImports += $import
                } else {
                    $nonSqlImports += $import
                }
            }
            
            if ($sqlImports.Count -gt 0) {
                $newImportLines = @()
                
                if ($nonSqlImports.Count -gt 0) {
                    $nonSqlImportsStr = $nonSqlImports -join ', '
                    $newImportLines += "import { $nonSqlImportsStr } from 'drizzle-orm';"
                }
                
                $newImportLines += "import { sql } from 'drizzle-orm/sql';"
                
                $newImports = $newImportLines -join "`n"
                $content = $content -replace $importPattern, $newImports
            }
        }
    }
    
    # Write back if changed
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "  Updated imports in $($file.Name)"
    }
}

Write-Host "Final Drizzle import fix complete!"
