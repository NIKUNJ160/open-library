#!/usr/bin/env bash

set -euo pipefail

WORKDIR="/workspace/universal_search_engine"
ARTIFACTS="/workspace/.source-aware"

mkdir -p "$ARTIFACTS"

echo "Running semgrep..."
semgrep scan --config p/default --config p/secrets --metrics=off --json --output "$ARTIFACTS/semgrep.json" "$WORKDIR"

echo "Generating sg targets..."
python3 - <<'PY'
import json, pathlib, sys
art = pathlib.Path("/workspace/.source-aware")
semgrep_path = art / "semgrep.json"
targets_path = art / "sg-targets.txt"
try:
    data = json.loads(semgrep_path.read_text())
except Exception as e:
    sys.stderr.write(f"Failed to read semgrep JSON: {e}\n")
    targets_path.write_text("", encoding="utf-8")
    sys.exit(0)
scanned = data.get("paths", {}).get("scanned")
if not scanned:
    scanned = sorted({r.get("path") for r in data.get("results", []) if isinstance(r, dict) and isinstance(r.get("path"), str)})
bounded = scanned[:4000] if isinstance(scanned, list) else []
targets_path.write_text("\n".join(bounded), encoding="utf-8")
print(f"sg-targets: {len(bounded)}")
PY

echo "Running ast-grep..."
if [ -s "$ARTIFACTS/sg-targets.txt" ]; then
  xargs -r -n 200 sg run --pattern '$F($$$ARGS)' --json=stream < "$ARTIFACTS/sg-targets.txt" > "$ARTIFACTS/ast-grep.json" 2> "$ARTIFACTS/ast-grep.log" || true
else
  echo "No sg targets, skipping ast-grep."
fi

echo "Running gitleaks..."
gitleaks detect --source "$WORKDIR" --report-format json --report-path "$ARTIFACTS/gitleaks.json" || true

echo "Running trufflehog..."
trufflehog filesystem --no-update --json --no-verification "$WORKDIR" > "$ARTIFACTS/trufflehog.json" || true

echo "Running trivy..."
trivy fs --scanners vuln,misconfig --timeout 30m --offline-scan --format json --output "$ARTIFACTS/trivy-fs.json" "$WORKDIR" || true

echo "Static analysis completed."