' Press 
' Window + R
' Paste This in the Run Wizard :: 
' shell:startup
' pip install pyautogui
' VS code port forwarding shortcut set
' Ctrl + Shift + P
' forward a port
' set ctrl + shift + 3

Set WshShell = CreateObject("WScript.Shell")

' Start PortForwarding.py
WshShell.Run "cmd /c cd /d E:\GIT\NetFlix_Clone___NextJS && python PortForwarding.py", 1, False

' Start PortForwarding.py
' WshShell.Run "cmd /c cd /d E:\VS Code Automation && python PortForwarding.py", 1, False