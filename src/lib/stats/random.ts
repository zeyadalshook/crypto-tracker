// Deterministic Pseudo-Random Number Generator (mulberry32)
// Provides reproducible resampling across Bootstrap and Monte Carlo runs

export class Mulberry32 {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
  }

  // Returns pseudo-random float in [0, 1)
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns integer in [min, max]
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Shuffle array using Fisher-Yates
  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

export function createRNG(seed: number = 1337): Mulberry32 {
  return new Mulberry32(seed);
}
