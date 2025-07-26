# Fix Drizzle ORM type issues in schema.ts
$filePath = "server\src\db\schema.ts"
$content = Get-Content $filePath -Raw

# Remove complex multiline .$type<...>() patterns
$content = $content -replace '\.\$type<[^>]*(?:\{[^}]*\}[^>]*)*>\(\)', ''

# Remove simple .$type<...>() patterns  
$content = $content -replace '\.\$type<[^>]*>\(\)', ''

# Remove .as<...>() patterns
$content = $content -replace '\.as<[^>]*>\(\)', ''

# Save the fixed content
$content | Set-Content $filePath -NoNewline

Write-Host "Fixed schema type annotations"
