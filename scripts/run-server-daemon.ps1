Set-Location -Path "D:\RoomBites\backend"
while ($true) {
    try {
        $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Add-Content -Path "D:\RoomBites\backend\server.log" -Value "[$timestamp] RoomBites Backend Server starting..."
        & "C:\Program Files\nodejs\node.exe" "dist\index.js" 2>&1 | Out-File -FilePath "D:\RoomBites\backend\server.log" -Append -Encoding utf8
    } catch {
        Add-Content -Path "D:\RoomBites\backend\server.log" -Value "[$timestamp] Error: $_"
    }
    Start-Sleep -Seconds 2
}
