# Fix common import paths in TypeScript files
param(
    [string]$RootPath = "c:\Users\jbirc\Desktop\NestleIn\NestMapRepo\server\src"
)

Write-Host "Starting TypeScript import path fixes..."

# Define common import fixes
$importFixes = @(
    # Fix shared schema imports
    @{
        Pattern = 'from [''"]@shared/schema[''"];?'
        Replacement = "from '@shared/src/types/api';"
        Description = "Fix @shared/schema imports"
    },
    @{
        Pattern = 'from [''"]\.\.\/\.\.\/shared\/src\/schema[''"];?'
        Replacement = "from '@shared/src/types/api';"
        Description = "Fix relative shared schema imports"
    },
    # Fix drizzle imports
    @{
        Pattern = 'from [''"]drizzle-orm/postgres-js[''"];?'
        Replacement = "from 'drizzle-orm/postgres-js';"
        Description = "Fix drizzle postgres imports"
    },
    @{
        Pattern = 'import \{ sql \} from [''"]drizzle-orm[''"];?'
        Replacement = "import { sql } from 'drizzle-orm';"
        Description = "Fix drizzle sql imports"
    },
    # Fix local imports that might be broken
    @{
        Pattern = 'from [''"]\.\.\/\.\.\/\.\.\/shared\/src\/types[''"];?'
        Replacement = "from '@shared/src/types';"
        Description = "Fix deep relative shared imports"
    }
)

# Function to fix imports in a file
function Fix-ImportsInFile {
    param([string]$FilePath)
    
    try {
        $content = Get-Content -Path $FilePath -Raw -ErrorAction Stop
        $originalContent = $content
        $changed = $false
        
        foreach ($fix in $importFixes) {
            if ($content -match $fix.Pattern) {
                $content = $content -replace $fix.Pattern, $fix.Replacement
                $changed = $true
                Write-Host "  Applied: $($fix.Description)"
            }
        }
        
        if ($changed) {
            Set-Content -Path $FilePath -Value $content -NoNewline
            Write-Host "Fixed: $FilePath" -ForegroundColor Green
            return $true
        }
        
        return $false
    }
    catch {
        Write-Host "Error processing $FilePath : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Find all TypeScript files
$tsFiles = Get-ChildItem -Path $RootPath -Recurse -Filter "*.ts" | Where-Object { !$_.Name.EndsWith('.d.ts') }

Write-Host "Found $($tsFiles.Count) TypeScript files to process..."

$fixedCount = 0
foreach ($file in $tsFiles) {
    Write-Host "Processing: $($file.FullName.Substring($RootPath.Length + 1))"
    if (Fix-ImportsInFile -FilePath $file.FullName) {
        $fixedCount++
    }
}

Write-Host "Completed! Fixed $fixedCount files." -ForegroundColor Cyan
Write-Host "Run 'npm run build' or check TypeScript errors to see remaining issues."
