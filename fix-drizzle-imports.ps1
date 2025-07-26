# Fix drizzle-orm imports with explicit paths
param(
    [string]$RootPath = "c:\Users\jbirc\Desktop\NestleIn\NestMapRepo\server\src"
)

Write-Host "Fixing Drizzle ORM imports with explicit paths..." -ForegroundColor Cyan

# Define replacement patterns for drizzle imports
$drizzleImportFixes = @(
    @{
        Pattern = "import \{ ([^}]*eq[^}]*) \} from 'drizzle-orm';"
        Replacement = {
            param($match)
            $imports = $match.Groups[1].Value
            # Parse the imports and categorize them
            $conditions = @('eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'and', 'or', 'not', 'inArray', 'notInArray', 'between', 'notBetween', 'like', 'notLike', 'ilike', 'notIlike', 'exists', 'notExists', 'isNull', 'isNotNull')
            $functions = @('count', 'countDistinct', 'avg', 'sum', 'min', 'max')
            $selects = @('desc', 'asc')
            $sql = @('sql')
            
            $conditionImports = @()
            $functionImports = @()
            $selectImports = @()
            $sqlImports = @()
            $otherImports = @()
            
            $importList = $imports -split ',' | ForEach-Object { $_.Trim() }
            
            foreach ($imp in $importList) {
                if ($conditions -contains $imp) { $conditionImports += $imp }
                elseif ($functions -contains $imp) { $functionImports += $imp }
                elseif ($selects -contains $imp) { $selectImports += $imp }
                elseif ($sql -contains $imp) { $sqlImports += $imp }
                else { $otherImports += $imp }
            }
            
            $result = @()
            if ($conditionImports.Count -gt 0) {
                $result += "import { $($conditionImports -join ', ') } from 'drizzle-orm';"
            }
            if ($functionImports.Count -gt 0) {
                $result += "import { $($functionImports -join ', ') } from 'drizzle-orm';"
            }
            if ($selectImports.Count -gt 0) {
                $result += "import { $($selectImports -join ', ') } from 'drizzle-orm';"
            }
            if ($sqlImports.Count -gt 0) {
                $result += "import { $($sqlImports -join ', ') } from 'drizzle-orm';"
            }
            if ($otherImports.Count -gt 0) {
                $result += "import { $($otherImports -join ', ') } from 'drizzle-orm';"
            }
            
            return $result -join "`n"
        }
        Description = "Fix mixed drizzle imports"
    }
)

# Simple function to apply regex replacements
function Apply-DrizzleImportFixes {
    param([string]$FilePath)
    
    try {
        $content = Get-Content -Path $FilePath -Raw -ErrorAction Stop
        $originalContent = $content
        $changed = $false
        
        # Simple replacements for common patterns
        $simpleReplacements = @{
            "import \{ eq, and, count, sql \} from 'drizzle-orm';" = "import { eq, and, sql } from 'drizzle-orm';`nimport { count } from 'drizzle-orm';"
            "import \{ eq, and, gte, count, avg, desc, countDistinct, sql \} from 'drizzle-orm';" = "import { eq, and, gte, desc, sql } from 'drizzle-orm';`nimport { count, avg, countDistinct } from 'drizzle-orm';"
            "import \{ eq, and, gte, lte, desc, count \} from 'drizzle-orm';" = "import { eq, and, gte, lte, desc } from 'drizzle-orm';`nimport { count } from 'drizzle-orm';"
            "import \{ eq, and, gt \} from 'drizzle-orm';" = "import { eq, and, gt } from 'drizzle-orm';"
            "import \{ sql \} from 'drizzle-orm';" = "import { sql } from 'drizzle-orm';"
            "import \{ eq \} from 'drizzle-orm';" = "import { eq } from 'drizzle-orm';"
        }
        
        foreach ($find in $simpleReplacements.Keys) {
            $replace = $simpleReplacements[$find]
            if ($content -match [regex]::Escape($find)) {
                $content = $content -replace [regex]::Escape($find), $replace
                $changed = $true
                Write-Host "    Applied simple replacement for: $find" -ForegroundColor Green
            }
        }
        
        if ($changed) {
            Set-Content -Path $FilePath -Value $content -NoNewline
            return $true
        }
        
        return $false
    }
    catch {
        Write-Host "Error processing $FilePath : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Process all TypeScript files
$tsFiles = Get-ChildItem -Path $RootPath -Recurse -Filter "*.ts" | Where-Object { !$_.Name.EndsWith('.d.ts') }

Write-Host "Found $($tsFiles.Count) TypeScript files to process..."

$fixedCount = 0
foreach ($file in $tsFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and ($content -match "from 'drizzle-orm'")) {
        Write-Host "Processing: $($file.Name)"
        if (Apply-DrizzleImportFixes -FilePath $file.FullName) {
            $fixedCount++
        }
    }
}

Write-Host "✅ Completed! Fixed $fixedCount files." -ForegroundColor Green
