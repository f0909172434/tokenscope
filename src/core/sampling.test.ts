import { describe, expect, it } from 'vitest';
import { distribution, sample, sampleMany, seededRandom } from './sampling';

const base = { temperature: 1, topK: 0, topP: 1 };
const logits = [0.5, 0.3, 0.15, 0.05].map(Math.log);

describe('sampling distribution', () => {
  it('preserves the full distribution without filtering', () => {
    const result = distribution(logits, base);
    [0.5, 0.3, 0.15, 0.05].forEach((p, i) => expect(result.probabilities[i]).toBeCloseTo(p, 14));
  });
  it('applies top-k, renormalizes, then includes the top-p crossing token', () => {
    const result = distribution(logits, { ...base, topK: 3, topP: 0.8 });
    expect(result.kept).toEqual([0, 1]);
    expect(result.probabilities[0]).toBeCloseTo(0.625, 14);
    expect(result.probabilities[1]).toBeCloseTo(0.375, 14);
    expect(result.probabilities.slice(2)).toEqual([0, 0]);
  });
  it('top-p=1 keeps all candidates, including underflowed entries', () => {
    expect(distribution([1000, 0, -1000], base).kept).toEqual([0, 1, 2]);
  });
  it('top-p below the largest mass still keeps one candidate', () => {
    expect(distribution(logits, { ...base, topP: 0.01 }).probabilities).toEqual([1, 0, 0, 0]);
  });
  it('greedy decoding chooses the first index on a tie', () => {
    expect(distribution([1, 3, 3], { ...base, temperature: 0 }).probabilities).toEqual([0, 1, 0]);
  });
  it('sorts equal positive-temperature logits by index', () => {
    expect(distribution([1, 1, 1], { ...base, topK: 2 }).kept).toEqual([0, 1]);
  });
  it('higher temperature increases the unfiltered entropy for unequal logits', () => {
    expect(distribution(logits, { ...base, temperature: 2 }).entropy).toBeGreaterThan(
      distribution(logits, { ...base, temperature: 0.5 }).entropy,
    );
  });
  it('is normalized across temperature and filter combinations', () => {
    for (const temperature of [0, 0.01, 0.7, 2, 1000])
      for (const topK of [0, 1, 3, 4])
        for (const topP of [0.01, 0.6, 0.95, 1]) {
          const { probabilities, entropy } = distribution(logits, { temperature, topK, topP });
          expect(probabilities.reduce((a, b) => a + b)).toBeCloseTo(1, 13);
          expect(probabilities.every((p) => p >= 0 && Number.isFinite(p))).toBe(true);
          expect(entropy).toBeGreaterThanOrEqual(0);
        }
  });
  it('rejects invalid parameters before computing', () => {
    for (const temperature of [-1, NaN, Infinity])
      expect(() => distribution(logits, { ...base, temperature })).toThrow();
    for (const topK of [-1, 1.5, 5, NaN])
      expect(() => distribution(logits, { ...base, topK })).toThrow();
    for (const topP of [0, -1, 1.1, NaN])
      expect(() => distribution(logits, { ...base, topP })).toThrow();
    expect(() => distribution([], base)).toThrow();
    expect(() => distribution([Infinity], base)).toThrow();
  });
});

describe('seeded categorical draws', () => {
  it('uses half-open CDF intervals and never picks zero-probability tails', () => {
    expect(sample([0, 0.25, 0.75, 0], () => 0)).toBe(1);
    expect(sample([0, 0.25, 0.75, 0], () => 0.25)).toBe(2);
    expect(sample([0, 0.25, 0.75, 0], () => 0.999999999999)).toBe(2);
  });
  it('has a stable replay and prefix for a fixed seed', () => {
    const draws = sampleMany([0.2, 0.3, 0.5], 100, 42);
    expect(draws).toEqual(sampleMany([0.2, 0.3, 0.5], 100, 42));
    expect(draws.slice(0, 20)).toEqual(sampleMany([0.2, 0.3, 0.5], 20, 42));
    expect(draws).not.toEqual(sampleMany([0.2, 0.3, 0.5], 100, 43));
  });
  it('matches target frequencies in a fixed-seed 100,000-draw regression', () => {
    const draws = sampleMany([0.2, 0.3, 0.5], 100000, 7);
    [0.2, 0.3, 0.5].forEach((p, i) =>
      expect(Math.abs(draws.filter((n) => n === i).length / draws.length - p)).toBeLessThan(0.005),
    );
  });
  it('accepts both uint32 seed boundaries', () => {
    for (const seed of [0, 4294967295]) {
      const rng = seededRandom(seed);
      for (let i = 0; i < 100; i++) {
        const value = rng();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    }
  });
  it('rejects invalid seeds, counts, probability masses, and random numbers', () => {
    for (const seed of [-1, 0.1, NaN, 4294967296]) expect(() => seededRandom(seed)).toThrow();
    expect(() => sampleMany([1], -1, 0)).toThrow();
    expect(() => sampleMany([1], 100001, 0)).toThrow();
    expect(() => sample([0.2, 0.2], () => 0.5)).toThrow();
    expect(() => sample([-0.1, 1.1], () => 0.5)).toThrow();
    for (const random of [-0.1, 1, NaN]) expect(() => sample([1], () => random)).toThrow();
  });
});
