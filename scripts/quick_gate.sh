#!/usr/bin/env bash
set -euo pipefail

# PlantRun quick local gate (maintainer pre-PR check)

echo "[quick-gate] Running Python tests"
python3 -m unittest discover -s tests -q

echo "[quick-gate] Done ✅"
