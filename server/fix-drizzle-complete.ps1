# Comprehensive Drizzle ORM 0.39.x import fixer
$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts"

# Define the import mappings
$sqlFunctions = @('sql', 'placeholder')
$expressionFunctions = @('and', 'or', 'not', 'eq', 'gt', 'gte', 'lt', 'lte', 'inArray', 'isNull', 'isNotNull', 'count', 'sum', 'avg', 'min', 'max', 'countDistinct', 'asc', 'desc')

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Pattern to match drizzle-orm import lines
    if ($content -match 'from [''"]drizzle-orm[''"]') {
        Write-Host "Processing: $($file.FullName)"
        
        # Extract the import line
        $importPattern = 'import\s*\{\s*([^}]+)\s*\}\s*from\s*[''"]drizzle-orm[''"];?'
        if ($content -match $importPattern) {
            $imports = $matches[1]
            $importsList = $imports -split ',' | ForEach-Object { $_.Trim() }
            
            $remainingImports = @()
            $sqlImports = @()
            $expressionImports = @()
            
            foreach ($import in $importsList) {
                if ($sqlFunctions -contains $import) {
                    $sqlImports += $import
                } elseif ($expressionFunctions -contains $import) {
                    $expressionImports += $import
                } else {
                    # Keep other imports (like InferSelectModel, etc.) in main drizzle-orm
                    $remainingImports += $import
                }
            }
            
            $newImportLines = @()
            
            # Add remaining drizzle-orm imports if any
            if ($remainingImports.Count -gt 0) {
                $remainingImportsStr = $remainingImports -join ', '
                $newImportLines += "import { $remainingImportsStr } from 'drizzle-orm';"
            }
            
            # Add expression imports if any
            if ($expressionImports.Count -gt 0) {
                $expressionImportsStr = $expressionImports -join ', '
                $newImportLines += "import { $expressionImportsStr } from 'drizzle-orm/expressions';"
            }
            
            # Add sql imports if any
            if ($sqlImports.Count -gt 0) {
                $sqlImportsStr = $sqlImports -join ', '
                $newImportLines += "import { $sqlImportsStr } from 'drizzle-orm/sql';"
            }
            
            $newImports = $newImportLines -join "`n"
            
            # Replace the original import
            $content = $content -replace $importPattern, $newImports
        }
        
        # Write back if changed
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            Write-Host "  Updated imports in $($file.Name)"
        }
    }
}

Write-Host "Comprehensive Drizzle import fix complete!"
