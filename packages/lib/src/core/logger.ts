import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

interface LogEntry {
  ts: string;
  level: string;
  event: string;
  [key: string]: unknown;
}

export class RingBuffer {
  private buf: LogEntry[] = [];
  constructor(private maxSize: number = 512) {}

  push(entry: LogEntry): void {
    this.buf.push(entry);
    if (this.buf.length > this.maxSize) this.buf.shift();
  }

  snapshot(): LogEntry[] {
    return [...this.buf];
  }
}

export class StructuredLogger {
  readonly buffer: RingBuffer;
  constructor(private logPath: string, bufferSize = 512) {
    mkdirSync(dirname(logPath), { recursive: true });
    this.buffer = new RingBuffer(bufferSize);
  }

  private write(level: string, event: string, fields: Record<string, unknown> = {}): void {
    const entry: LogEntry = { ts: new Date().toISOString(), level, event, ...fields };
    appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
    this.buffer.push(entry);
  }

  info(event: string, fields?: Record<string, unknown>): void { this.write('INFO', event, fields); }
  warn(event: string, fields?: Record<string, unknown>): void { this.write('WARN', event, fields); }
  error(event: string, fields?: Record<string, unknown>): void { this.write('ERROR', event, fields); }
}
