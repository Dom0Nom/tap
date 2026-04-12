export interface Clock {
  now(): Date;
  asOfDate(): string;  // YYYY-MM-DD
}

export class RealClock implements Clock {
  now(): Date { return new Date(); }
  asOfDate(): string { return this.now().toISOString().slice(0, 10); }
}

export class FixedClock implements Clock {
  constructor(private readonly fixedNow: Date) {}
  now(): Date { return this.fixedNow; }
  asOfDate(): string { return this.fixedNow.toISOString().slice(0, 10); }
}
