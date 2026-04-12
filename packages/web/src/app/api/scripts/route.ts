import { NextResponse } from 'next/server';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const SCRIPTS: Record<string, { name: string; description: string; script: string }> = {
  'sync-bars': { name: 'Sync Bars', description: 'Fetch latest bars from Alpaca', script: 'sync-bars.ts' },
  'run-signals': { name: 'Run Signals', description: 'Compute signals from local data', script: 'run-signals.ts' },
  'run-backtest': { name: 'Run Backtest', description: 'Full backtest on local bars', script: 'run-backtest.ts' },
};

function findProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = join(dir, '..');
  }
  return process.cwd();
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ scripts: SCRIPTS });
}

export async function POST(request: Request): Promise<NextResponse> {
  const { scriptId } = (await request.json()) as { scriptId: string };
  const script = SCRIPTS[scriptId];
  if (!script) {
    return NextResponse.json({ error: 'Unknown script' }, { status: 400 });
  }

  const projectRoot = findProjectRoot();
  const cmd = `npx tsx packages/lib/src/cli/${script.script}`;

  try {
    const output = execSync(cmd, {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 120_000,
      env: { ...process.env, NODE_ENV: 'development' },
    });
    return NextResponse.json({ success: true, output, scriptId });
  } catch (e: unknown) {
    const error = e as { stdout?: string; stderr?: string; message?: string };
    const output = [error.stdout ?? '', error.stderr ?? error.message ?? 'Unknown error']
      .filter(Boolean)
      .join('\n');
    return NextResponse.json({ success: false, output, scriptId });
  }
}
