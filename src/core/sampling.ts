import { softmax } from './attention';

export interface SamplingOptions {
  temperature: number;
  topK: number;
  topP: number;
}

/** Temperature -> top-k -> renormalize -> top-p -> renormalize. */
export function distribution(logits: number[], options: SamplingOptions) {
  const { temperature, topK, topP } = options;
  if (!logits.length || logits.some((n) => !Number.isFinite(n)))
    throw new RangeError('Logits must be finite and non-empty');
  if (!Number.isFinite(temperature) || temperature < 0)
    throw new RangeError('Temperature must be non-negative');
  if (!Number.isInteger(topK) || topK < 0 || topK > logits.length)
    throw new RangeError('Invalid top-k');
  if (!Number.isFinite(topP) || topP <= 0 || topP > 1)
    throw new RangeError('Top-p must be in (0, 1]');
  const ranked = logits.map((_, i) => i).sort((a, b) => logits[b] - logits[a] || a - b);
  if (temperature === 0) {
    const probabilities = logits.map((_, i) => (i === ranked[0] ? 1 : 0));
    return { base: probabilities, probabilities, kept: [ranked[0]], entropy: 0 };
  }
  const base = softmax(logits, temperature);
  const candidates = ranked.slice(0, topK || logits.length);
  const kMass = candidates.reduce((sum, i) => sum + base[i], 0);
  const kept: number[] = [];
  let cumulative = 0;
  for (const i of candidates) {
    kept.push(i);
    cumulative += base[i] / kMass;
    if (topP < 1 && cumulative >= topP) break;
  }
  const mass = kept.reduce((sum, i) => sum + base[i], 0);
  const probabilities = base.map((value, i) => (kept.includes(i) ? value / mass : 0));
  const entropy = -probabilities.reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0);
  return { base, probabilities, kept, entropy };
}

/** Mulberry32: reproducible educational sampling, not cryptography. */
export function seededRandom(seed: number): () => number {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError('Seed must be uint32');
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sample(probabilities: number[], random: () => number): number {
  const mass = probabilities.reduce((a, b) => a + b, 0);
  if (
    !probabilities.length ||
    probabilities.some((n) => !Number.isFinite(n) || n < 0) ||
    Math.abs(mass - 1) > 1e-9
  ) {
    throw new RangeError('Expected a normalized probability distribution');
  }
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new RangeError('Random value must be in [0, 1)');
  let cumulative = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (value < cumulative) return i;
  }
  // Floating-point summation can finish just below 1. Never choose a zero-probability tail.
  for (let i = probabilities.length - 1; i >= 0; i--) if (probabilities[i] > 0) return i;
  throw new RangeError('Distribution has no positive probability');
}

export function sampleMany(probabilities: number[], count: number, seed: number) {
  if (!Number.isInteger(count) || count < 0 || count > 100000)
    throw new RangeError('Invalid sample count');
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => sample(probabilities, random));
}

export const SAMPLING_LOGITS = [3.1, 2.7, 2.1, 1.5, 1.0, 0.2, -0.5, -1.1];
