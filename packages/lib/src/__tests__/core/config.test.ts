import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, configHash } from '../../core/config.js';

describe('loadConfig', () => {
  it('parses TOML and validates', () => {
    const dir = join(tmpdir(), `tap-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'config.toml');
    writeFileSync(path, `
[strategy]
name = "momentum_rsi"
weights = { momentum = 0.4, mean_reversion = 0.4, sentiment = 0.2 }
pre_filter_size = 20
max_positions = 10
rebalance_cadence = "monthly"
breakout_margin = 0.15

[risk]
target_risk_per_position = 0.01
stop_atr_multiple = 2.0

[broker]
mode = "alpaca_paper"
slippage_bps = 5

[llm]
model = "haiku"
cache_dir = "/tmp/cache"

[data]
bars_dir = "data/bars"
news_db = "data/news.sqlite"
ledger_db = "data/ledger.sqlite"
universe_csv = "data/universe/sp500_history.csv"

[universe]
index = "SP500"
`);
    const c = loadConfig(path);
    expect(c.strategy.name).toBe('momentum_rsi');
    expect(c.strategy.weights.momentum).toBe(0.4);
    expect(c.risk.target_risk_per_position).toBe(0.01);
  });

  it('produces stable hash', () => {
    const dir = join(tmpdir(), `tap-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'config.toml');
    writeFileSync(path, `
[strategy]
name="x"
weights={}
pre_filter_size=1
max_positions=1
rebalance_cadence="monthly"
breakout_margin=0.0
[risk]
target_risk_per_position=0.01
stop_atr_multiple=2.0
[broker]
mode="alpaca_paper"
slippage_bps=5
[llm]
model="m"
cache_dir="/tmp"
[data]
bars_dir="a"
news_db="b"
ledger_db="c"
universe_csv="d"
[universe]
index="SP500"
`);
    const c = loadConfig(path);
    expect(configHash(c)).toBe(configHash(c));
    expect(configHash(c)).toHaveLength(64);
  });
});
