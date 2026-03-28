@echo off
cd /d C:\Users\RAULBR~1\weekswap
del .git\HEAD.lock 2>/dev/null
del .git\index.lock 2>/dev/null
C:\Git\cmd\git.exe add server\server.ts src\pages\WeeksPage.tsx
C:\Git\cmd\git.exe commit -m "feat: week valuation engine + exchange fee"
C:\Git\cmd\git.exe push
