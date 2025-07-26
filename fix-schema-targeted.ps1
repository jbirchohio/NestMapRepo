# More comprehensive fix for Drizzle ORM type issues
$filePath = "server\src\db\schema.ts"
$content = Get-Content $filePath -Raw

# Replace specific patterns line by line approach - first handle simple ones
$simplePatterns = @(
    'jsonb\(([^)]+)\)\.\$type<Record<string, any>>\(\)'
    'jsonb\(([^)]+)\)\.\$type<Record<string, number>>\(\)'
    'jsonb\(([^)]+)\)\.\$type<string\[\]>\(\)'
)

foreach ($pattern in $simplePatterns) {
    $content = $content -replace $pattern, 'jsonb($1)'
}

# Handle patterns with .default() after them
$content = $content -replace 'jsonb\(([^)]+)\)\.\$type<Record<string, any>>\(\)\.default\(([^)]+(?:\([^)]*\))*)\)', 'jsonb($1).default($2)'
$content = $content -replace 'jsonb\(([^)]+)\)\.\$type<string\[\]>\(\)\.default\(([^)]+(?:\([^)]*\))*)\)', 'jsonb($1).default($2)'

# Handle patterns with .notNull() after them  
$content = $content -replace 'jsonb\(([^)]+)\)\.\$type<Record<string, any>>\(\)\.notNull\(\)', 'jsonb($1).notNull()'

# Save the fixed content
$content | Set-Content $filePath -NoNewline

Write-Host "Applied targeted fixes to schema"
