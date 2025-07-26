# Comprehensive TypeScript error fix script
param(
    [string]$RootPath = "c:\Users\jbirc\Desktop\NestleIn\NestMapRepo\server\src"
)

Write-Host "Starting comprehensive TypeScript fixes..." -ForegroundColor Cyan

# Function to fix a file with multiple replacements
function Fix-FileWithReplacements {
    param(
        [string]$FilePath,
        [array]$Replacements
    )
    
    try {
        $content = Get-Content -Path $FilePath -Raw -ErrorAction Stop
        $originalContent = $content
        $changed = $false
        
        foreach ($replacement in $Replacements) {
            if ($content -match [regex]::Escape($replacement.From)) {
                $content = $content -replace [regex]::Escape($replacement.From), $replacement.To
                $changed = $true
                Write-Host "    Applied: $($replacement.Description)" -ForegroundColor Green
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

# Fix drizzle ORM imports across all files
Write-Host "`n🔧 Fixing Drizzle ORM imports..." -ForegroundColor Yellow

$drizzleFixes = @(
    @{
        From = 'import \{ eq, and, count, sql \} from ''drizzle-orm'';'
        To = 'import { eq, and, count, sql } from ''drizzle-orm'';'
        Description = "Keep valid drizzle imports"
    },
    @{
        From = 'from ''drizzle-orm/expressions'''
        To = 'from ''drizzle-orm'''
        Description = "Fix drizzle expressions import path"
    },
    @{
        From = 'from ''drizzle-orm/sql'''
        To = 'from ''drizzle-orm'''
        Description = "Fix drizzle sql import path"
    }
)

# Apply drizzle fixes to all TypeScript files
$tsFiles = Get-ChildItem -Path $RootPath -Recurse -Filter "*.ts" | Where-Object { !$_.Name.EndsWith('.d.ts') }

foreach ($file in $tsFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and ($content -match "drizzle-orm")) {
        Write-Host "Processing drizzle imports in: $($file.Name)"
        Fix-FileWithReplacements -FilePath $file.FullName -Replacements $drizzleFixes
    }
}

Write-Host "`n🔧 Fixing winston logger imports..." -ForegroundColor Yellow

# Fix winston logger issues
$loggerFile = Join-Path $RootPath "utils\logger.ts"
if (Test-Path $loggerFile) {
    Write-Host "Fixing winston logger file..."
    $loggerFixes = @(
        @{
            From = 'import winston, \{ Logger \} from ''winston'';'
            To = 'import winston from ''winston'';'
            Description = "Fix winston import"
        },
        @{
            From = 'export \{ Logger \} from ''winston'';'
            To = 'export const Logger = winston;'
            Description = "Export logger correctly"
        }
    )
    Fix-FileWithReplacements -FilePath $loggerFile -Replacements $loggerFixes
}

Write-Host "`n🔧 Fixing Express type issues..." -ForegroundColor Yellow

# Fix Express types in the current file
$responseFile = Join-Path $RootPath "utils\response.ts"
if (Test-Path $responseFile) {
    Write-Host "Fixing Express Response types..."
    $responseFixes = @(
        @{
            From = '\): Response \{'
            To = '): Response<any> {'
            Description = "Fix Response return type"
        }
    )
    Fix-FileWithReplacements -FilePath $responseFile -Replacements $responseFixes
}

Write-Host "`n🔧 Fixing shared import paths..." -ForegroundColor Yellow

# Fix more shared imports
$sharedFixes = @(
    @{
        From = 'from ''../shared/src/schema'''
        To = 'from ''@shared/src/schema'''
        Description = "Fix shared schema import"
    },
    @{
        From = 'from ''../../../shared/src/schema'''
        To = 'from ''@shared/src/schema'''
        Description = "Fix deep shared schema import"
    },
    @{
        From = 'from ''../../../shared/src/types'''
        To = 'from ''@shared/src/types'''
        Description = "Fix deep shared types import"
    },
    @{
        From = 'from ''../shared/interfaces'''
        To = 'from ''@shared/src/types'''
        Description = "Fix shared interfaces import"
    }
)

foreach ($file in $tsFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and ($content -match "shared")) {
        Write-Host "Processing shared imports in: $($file.Name)"
        Fix-FileWithReplacements -FilePath $file.FullName -Replacements $sharedFixes
    }
}

Write-Host "`n🔧 Creating missing type files..." -ForegroundColor Yellow

# Create missing custom-request types
$customRequestFile = Join-Path $RootPath "types\custom-request.ts"
if (!(Test-Path $customRequestFile)) {
    Write-Host "Creating custom-request.ts..."
    $customRequestContent = @"
import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
"@
    Set-Content -Path $customRequestFile -Value $customRequestContent
}

Write-Host "`n✅ Comprehensive fixes completed!" -ForegroundColor Green
Write-Host "Run 'npx tsc --noEmit' to check remaining errors."
