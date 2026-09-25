@echo off
cd /d "%~dp0backend"
if exist ".venv\Scripts\pytest.exe" (
    ".venv\Scripts\pytest.exe" tests %*
) else (
    uv run pytest tests %*
)
