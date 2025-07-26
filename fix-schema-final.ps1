# Final comprehensive fix for all remaining .$type patterns
$filePath = "server\src\db\schema.ts"
$content = Get-Content $filePath -Raw

# Simple patterns with no additional methods
$content = $content -replace 'jsonb\(([^)]+)\)\.\$type<Record<string, any>>\(\)', 'jsonb($1)'
$content = $content -replace 'jsonb\(([^)]+)\)\.\$type<Record<string, number>>\(\)', 'jsonb($1)'

# Patterns with .default() after
$content = $content -replace 'jsonb\(([^)]+)\)\.\$type<Record<string, any>>\(\)\.default\(([^)]+(?:\([^)]*\))*)\)', 'jsonb($1).default($2)'

# Patterns with .notNull() after
$content = $content -replace 'jsonb\(([^)]+)\)\.\$type<Record<string, any>>\(\)\.notNull\(\)', 'jsonb($1).notNull()'

# Save the fixed content
$content | Set-Content $filePath -NoNewline

Write-Host "Final comprehensive fix applied"
