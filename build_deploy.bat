@echo off
cd /d "C:\Users\Raul brendon\weekswap"
echo Running npm build:client...
call "C:\Program Files\nodejs\npm.cmd" run build:client
echo Build exit code: %ERRORLEVEL%
echo Running firebase deploy...
call firebase deploy --only hosting
echo Deploy exit code: %ERRORLEVEL%
echo DONE
