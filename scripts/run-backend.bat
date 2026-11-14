@echo off
cd /d "D:\RoomBites\backend"
call npx tsx src/index.ts >> "D:\RoomBites\backend\server.log" 2>&1
