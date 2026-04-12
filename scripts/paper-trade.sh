#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npx tsx packages/lib/src/cli/paper-trade.ts
