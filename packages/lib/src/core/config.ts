import { parse as parseTOML } from 'smol-toml';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const StrategySchema = z.object({
  name: z.string(),
  weights: z.record(z.number()),
  pre_filter_size: z.number(),
  max_positions: z.number(),
  rebalance_cadence: z.string(),
  breakout_margin: z.number(),
});

const RiskSchema = z.object({
  target_risk_per_position: z.number(),
  stop_atr_multiple: z.number(),
});

const BrokerSchema = z.object({
  mode: z.string(),
  slippage_bps: z.number(),
});

const LLMSchema = z.object({
  model: z.string(),
  cache_dir: z.string(),
});

const DataSchema = z.object({
  bars_dir: z.string(),
  news_db: z.string(),
  ledger_db: z.string(),
  universe_csv: z.string(),
});

const UniverseSchema = z.object({
  index: z.string(),
});

export const ConfigSchema = z.object({
  strategy: StrategySchema,
  risk: RiskSchema,
  broker: BrokerSchema,
  llm: LLMSchema,
  data: DataSchema,
  universe: UniverseSchema,
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(path: string): Config {
  const raw = readFileSync(path, 'utf-8');
  const parsed = parseTOML(raw);
  return ConfigSchema.parse(parsed);
}

export function configHash(config: Config): string {
  const canonical = JSON.stringify(config, Object.keys(config).sort());
  return createHash('sha256').update(canonical).digest('hex');
}
