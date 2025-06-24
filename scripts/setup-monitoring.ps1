#Requires -RunAsAdministrator

# Configuration
$scriptPath = Join-Path $PSScriptRoot "monitoring\db-monitor.js"
$nodePath = (Get-Command node).Source
$taskName = "NestMap Database Monitoring"
$description = "Runs database monitoring and collects metrics"
$metricsDir = Join-Path (Split-Path $PSScriptRoot -Parent) "metrics"

# Ensure metrics directory exists
if (-not (Test-Path $metricsDir)) {
    New-Item -ItemType Directory -Path $metricsDir | Out-Null
}

# Create a batch file to run the monitoring
$batchContent = @"
@echo off
"$nodePath" "$scriptPath"
"@

$batchPath = Join-Path $env:TEMP "nestmap-monitor.bat"
$batchContent | Out-File -FilePath $batchPath -Encoding ASCII

# Create scheduled task
$action = New-ScheduledTaskAction -Execute $batchPath -WorkingDirectory (Split-Path $scriptPath -Parent)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

# Register the task
Register-ScheduledTask -TaskName $taskName -Description $description -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force

# Configure the task with additional settings
$task = Get-ScheduledTask -TaskName $taskName
$task.Triggers[0].StartBoundary = [DateTime]::Now.ToString("s")
$task.Settings.ExecutionTimeLimit = "PT1H"  # 1 hour timeout
$task.Settings.Priority = 7  # Below normal priority
$task | Set-ScheduledTask

# Create a log rotation task
$logRotateScript = @"
# Rotate logs older than 30 days
Get-ChildItem "$metricsDir\*" -Recurse -File | Where-Object { 
    $_.LastWriteTime -lt (Get-Date).AddDays(-30) 
} | Remove-Item -Force
"@

$logRotatePath = Join-Path $env:TEMP "nestmap-logrotate.ps1"
$logRotateScript | Out-File -FilePath $logRotatePath -Encoding ASCII

# Schedule log rotation to run weekly
$logRotateAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$logRotatePath`""
$logRotateTrigger = New-ScheduledTaskTrigger -Weekly -At "3:00AM" -DaysOfWeek Sunday
$logRotateSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName "$taskName - Log Rotation" -Description "Rotates and cleans up old monitoring logs" -Action $logRotateAction -Trigger $logRotateTrigger -Settings $logRotateSettings -Force

Write-Host "Scheduled task '$taskName' has been created successfully."
Write-Host "Metrics will be stored in: $metricsDir"

# Export task for backup
$exportPath = Join-Path (Split-Path $scriptPath -Parent) "monitoring-task.xml"
Export-ScheduledTask -TaskName $taskName | Out-File -FilePath $exportPath

Write-Host "Task configuration exported to: $exportPath"

# Start the task immediately to test
Start-ScheduledTask -TaskName $taskName
Write-Host "Started the monitoring task. Check the metrics directory for output."
