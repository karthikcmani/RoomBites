@echo off
echo Stopping RoomBites Backend Server on port 4000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo RoomBites Backend Server stopped.
