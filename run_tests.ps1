$backendDir = Join-Path $PSScriptRoot "backend"
$venvPytest = Join-Path $backendDir ".venv\Scripts\pytest.exe"

if (Test-Path $venvPytest) {
    Set-Location $backendDir
    & $venvPytest tests $args
} else {
    Set-Location $backendDir
    uv run pytest tests $args
}
