# pip install pyautogui

import pyautogui
import time

pyautogui.FAILSAFE = True

print("Opening Start Menu...")
pyautogui.press("win")
time.sleep(1)

print("Searching VS Code...")
pyautogui.write("Visual Studio Code", interval=0.03)
time.sleep(1)
pyautogui.press("enter")

print("Waiting for VS Code...")
time.sleep(5)

print("Opening Terminal...")
pyautogui.hotkey("ctrl", "`")
time.sleep(2)

print("Opening Port Forwarding...")
pyautogui.hotkey("ctrl", "shift", "3")
time.sleep(1)

print("Entering port 3000...")
pyautogui.write("3000", interval=0.1)
time.sleep(0.5)
pyautogui.press("enter")

time.sleep(3)

print("Port 3000 forwarded.")


# ======================================
# FOCUS PORTS VIEW
# ======================================

print("Focusing Ports View...")

pyautogui.hotkey("ctrl", "shift", "p")
time.sleep(1)

pyautogui.write(
    "Ports: Focus on Ports View",
    interval=0.03
)

time.sleep(1)
pyautogui.press("enter")
time.sleep(2)

print("Ports View focused.")


# ======================================
# SELECT PORT 3000
# ======================================

pyautogui.press("tab")
time.sleep(0.5)

pyautogui.press("down")
time.sleep(0.5)


# ======================================
# OPEN CONTEXT MENU
# ======================================

print("Opening port context menu...")

pyautogui.hotkey("shift", "f10")
time.sleep(1)


# ======================================
# PORT VISIBILITY
# ======================================

print("Selecting Port Visibility...")

pyautogui.press("home")
time.sleep(0.3)

for _ in range(4):
    pyautogui.press("down")
    time.sleep(0.2)

pyautogui.press("right")
time.sleep(1)


# ======================================
# SELECT PUBLIC
# ======================================

print("Selecting Public...")

pyautogui.press("down")
time.sleep(0.5)

pyautogui.press("enter")

time.sleep(2)


# ======================================
# SECURITY WARNING
# ======================================

print("Waiting for confirmation...")

time.sleep(1)

pyautogui.press("enter")

time.sleep(3)


print()
print("======================================")
print("           AUTOMATION DONE")
print("======================================")
print()
print("Port       : 3000")
print("Visibility : PUBLIC")
print()
print("======================================")