@echo off
cd /d "D:\RoomBites\backend"
:loop
echo [%date% %time%] RoomBites Backend Server starting... >> "D:\RoomBites\backend\server.log"
"C:\Program Files\nodejs\node.exe" dist\index.js >> "D:\RoomBites\backend\server.log" 2>&1
echo [%date% %time%] RoomBites Backend Server stopped. Restarting in 2 seconds... >> "D:\RoomBites\backend\server.log"
timeout /t 2 /nobreak >nul
goto loop
