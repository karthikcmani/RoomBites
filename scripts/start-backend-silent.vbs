Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File ""D:\RoomBites\scripts\run-server-daemon.ps1""", 0, False
Set WshShell = Nothing
