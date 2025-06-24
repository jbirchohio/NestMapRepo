#Requires -RunAsAdministrator

# Configuration
$scriptPath = Join-Path $PSScriptRoot "database\backup.js"
$nodePath = (Get-Command node).Source
$taskName = "NestMap Database Backup"
$description = "Runs daily database backup for NestMap application"

# Ensure backup directory exists
$backupDir = Join-Path (Split-Path $PSScriptRoot -Parent) "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

# Create a batch file to run the backup
$batchContent = @"
@echo off
"$nodePath" "$scriptPath"
"@

$batchPath = Join-Path $env:TEMP "nestmap-backup.bat"
$batchContent | Out-File -FilePath $batchPath -Encoding ASCII

# Create scheduled task
$action = New-ScheduledTaskAction -Execute $batchPath -WorkingDirectory (Split-Path $scriptPath -Parent)
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

# Register the task
Register-ScheduledTask -TaskName $taskName -Description $description -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force

Write-Host "Scheduled task '$taskName' has been created successfully."
Write-Host "Backups will be stored in: $backupDir"

# Add environment variables to the task
$task = Get-ScheduledTask -TaskName $taskName
$task.Actions[0].WorkingDirectory = (Split-Path $scriptPath -Parent)
$task.Triggers[0].StartBoundary = [DateTime]::Now.Date.AddHours(2).ToString("s")
$task.Settings.ExecutionTimeLimit = "PT4H"  # 4 hour timeout
$task.Settings.Priority = 7  # Below normal priority
$task | Set-ScheduledTask

# Export task for backup
$exportPath = Join-Path (Split-Path $scriptPath -Parent) "backup-task.xml"
Export-ScheduledTask -TaskName $taskName | Out-File -FilePath $exportPath

Write-Host "Task configuration exported to: $exportPath"
