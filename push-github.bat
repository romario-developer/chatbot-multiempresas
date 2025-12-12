@echo off
cd /d "%~dp0"

:: URL correta do repositorio remoto
set "ORIGIN_URL=https://github.com/romario-developer/chatbot-multiempresas.git"

:: Garantir que o remote origin aponta para o URL correto
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%ORIGIN_URL%"
) else (
    for /f "usebackq delims=" %%i in (`git remote get-url origin`) do set CURRENT_URL=%%i
    if /i not "%CURRENT_URL%"=="%ORIGIN_URL%" git remote set-url origin "%ORIGIN_URL%"
)

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
