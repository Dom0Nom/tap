export function pctChange(arr: number[]): number[] {
  return arr.slice(1).map((v, i) => (v - arr[i]) / arr[i]);
}

export function rollingMean(arr: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
    } else {
      const slice = arr.slice(i - window + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / window);
    }
  }
  return result;
}

export function rollingStd(arr: number[], window: number): number[] {
  const means = rollingMean(arr, window);
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
    } else {
      const slice = arr.slice(i - window + 1, i + 1);
      const mean = means[i];
      const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (window - 1);
      result.push(Math.sqrt(variance));
    }
  }
  return result;
}

export function cumMax(arr: number[]): number[] {
  let max = -Infinity;
  return arr.map(v => { max = Math.max(max, v); return max; });
}

export function last(arr: number[]): number {
  return arr[arr.length - 1];
}

export function tail(arr: number[], n: number): number[] {
  return arr.slice(-n);
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function std(arr: number[]): number {
  if (arr.length < 2) return NaN;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function clip(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function dropNaN(arr: number[]): number[] {
  return arr.filter(v => !isNaN(v));
}

export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const aSlice = a.slice(-n);
  const bSlice = b.slice(-n);
  const meanA = aSlice.reduce((s, v) => s + v, 0) / n;
  const meanB = bSlice.reduce((s, v) => s + v, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = aSlice[i] - meanA;
    const db = bSlice[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}
