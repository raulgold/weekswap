@echo off
set "NODE=C:\Program Files\nodejs\node.exe"
set "FIREBASE_JS=C:\Users\Raul brendon\AppData\Roaming\npm\node_modules\firebase-tools\lib\bin\firebase.js"
set "GIT=C:\Git\cmd\git.exe"
set "PROJECT=C:\Users\Raul brendon\weekswap"

cd /d "%PROJECT%"

echo === BUILD: VITE CLIENT ===
"%NODE%" node_modules\vite\bin\vite.js build
if %errorlevel% neq 0 (
  echo VITE BUILD FALHOU
  exit /b 1
)

echo === BUILD: TSC SERVER ===
"%NODE%" node_modules\typescript\bin\tsc -p tsconfig.server.json
if %errorlevel% neq 0 (
  echo TSC BUILD FALHOU
  exit /b 1
)

echo === FIREBASE DEPLOY ===
"%NODE%" "%FIREBASE_JS%" deploy --only hosting
if %errorlevel% neq 0 (
  echo FIREBASE DEPLOY FALHOU
  exit /b 1
)

echo === GIT COMMIT E PUSH ===
"%GIT%" add -A
"%GIT%" commit -m "feat: geolocation gate + country-based exchange fee"
"%GIT%" push origin main

echo === TUDO PRONTO ===
