$output = pnpm tsc --noEmit 2>&1 | ForEach-Object { $_.ToString() }

# Match file name and error code on each error line
$matches = foreach ($line in $output) {
    if ($line -match "^(?<file>[^\s]+\.ts[x]?)\(\d+,\d+\):.*?(?<code>TS\d+)") {
        [PSCustomObject]@{
            File = $matches['file']
            Code = $matches['code']
        }
    }
}

# Group by file, then summarize error counts inside each file
$matches |
    Group-Object File |
    ForEach-Object {
        $file = $_.Name
        $codeSummary = $_.Group |
            Group-Object Code |
            Sort-Object Count -Descending |
            ForEach-Object { "({0}: {1})" -f $_.Name, $_.Count }
        "{0}  {1}" -f $file, ($codeSummary -join " ")
    }
