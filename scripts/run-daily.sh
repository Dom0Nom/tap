#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Sync bars from Alpaca, then run signals and the daily strategy
npx tsx packages/lib/src/cli/sync-bars.ts
npx tsx packages/lib/src/cli/run-signals.ts
npx tsx packages/lib/src/cli/run.ts
