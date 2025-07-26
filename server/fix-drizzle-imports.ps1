# Fix Drizzle ORM imports for version 0.39.x
$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Pattern to match drizzle-orm import lines
    if ($content -match 'from [''"]drizzle-orm[''"]') {
        Write-Host "Processing: $($file.FullName)"
        
        # Functions that need to be moved to drizzle-orm/sql
        $sqlFunctions = @('sql', 'placeholder')
        
        # Extract the import line
        $importPattern = 'import\s*\{\s*([^}]+)\s*\}\s*from\s*[''"]drizzle-orm[''"]'
        if ($content -match $importPattern) {
            $imports = $matches[1]
            $importsList = $imports -split ',' | ForEach-Object { $_.Trim() }
            
            $regularImports = @()
            $sqlImports = @()
            
            foreach ($import in $importsList) {
                if ($sqlFunctions -contains $import) {
                    $sqlImports += $import
                } else {
                    $regularImports += $import
                }
            }
            
            $newImportLines = @()
            
            # Add regular drizzle-orm imports if any
            if ($regularImports.Count -gt 0) {
                $regularImportsStr = $regularImports -join ', '
                $newImportLines += "import { $regularImportsStr } from 'drizzle-orm';"
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

Write-Host "Drizzle import fix complete!"
