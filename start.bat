@echo off
chcp 65001 >nul
rem ============================================================
rem  EFT Workbench を手元で開く（ダブルクリックで使う）
rem   1. このフォルダで簡易サーバーを起動する（py -m http.server）
rem   2. 2秒待ってから、ブラウザでトップページ（public/index.html）を開く
rem   マップ作成（手元専用）は http://localhost:8000/tools/mapmaker.html
rem   すでに「このフォルダ」で起動しているときは、ブラウザで開くだけ
rem   別のフォルダ（古い版）のサーバーが動いていたら、それを止めて、このフォルダで起動し直す
rem   使い終わったら、この黒い画面を閉じればサーバーも止まる
rem ============================================================
title EFT ツール（この画面を閉じると止まります）
cd /d "%~dp0"
set "PORT=8000"
set "URL=http://localhost:%PORT%/public/index.html"
set "MARK=%TEMP%\eft-tools-%PORT%.txt"

rem --- すでに起動しているか（そのプロセス番号も取る） ---
set "PID="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do set "PID=%%p"
if defined PID (
  set "RUNDIR="
  if exist "%MARK%" set /p RUNDIR=<"%MARK%"
  call :samedir && (
    start "" "%URL%"
    exit /b 0
  )
  echo 別のフォルダのサーバーが動いていたので止めて、このフォルダで起動し直します。
  taskkill /PID %PID% /F >nul 2>nul
  timeout /t 1 /nobreak >nul
)

rem --- Python を探す（py → python の順） ---
set "PY="
where py >nul 2>nul && set "PY=py"
if not defined PY (
  where python >nul 2>nul && set "PY=python"
)
if not defined PY (
  echo Python が見つかりませんでした。
  echo https://www.python.org/ からインストールしてから、もう一度ダブルクリックしてください。
  pause
  exit /b 1
)

rem --- どのフォルダで動かしているかを残す（次に起動したときの見分け用） ---
>"%MARK%" echo %~dp0

rem --- 少し待ってからブラウザを開く（サーバーの起動を待つため） ---
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process '%URL%'"

echo EFT ツールを起動しました： %URL%
echo フォルダ： %~dp0
echo 使っている間は、この画面を開いたままにしてください（閉じると止まります）。
echo.
%PY% -m http.server %PORT% --bind 127.0.0.1
exit /b 0

:samedir
rem 動いているサーバーのフォルダが、このフォルダと同じなら 0
if not defined RUNDIR exit /b 1
if /i "%RUNDIR%"=="%~dp0" exit /b 0
if /i "%RUNDIR%"=="%~dp0 " exit /b 0
exit /b 1
