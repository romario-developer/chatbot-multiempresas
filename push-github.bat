@echo off
cd /d "%~dp0"

:: Detectar branch atual
for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%i

echo Branch atual detectada: %BRANCH%
echo.

set /p MSG=Digite a mensagem do commit (ou deixe vazio para padrao):

if "%MSG%"=="" (
    set MSG=Atualizacao automatica
)

git add .
git commit -m "%MSG%"
git push origin %BRANCH%

echo.
echo Envio concluido para a branch %BRANCH%
pause
