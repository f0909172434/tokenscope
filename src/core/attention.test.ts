import { describe, expect, it } from 'vitest';
import { attention, ATTENTION_FIXTURE, softmax } from './attention';

describe('softmax', () => {
  it('matches a known probability vector', () => {
    const actual = softmax([Math.log(2), Math.log(3), Math.log(5)]);
    [0.2, 0.3, 0.5].forEach((n, i) => expect(actual[i]).toBeCloseTo(n, 14));
  });
  it('is translation invariant and handles large logits without overflow', () => {
    const a = softmax([1, 2, 3]),
      b = softmax([10001, 10002, 10003]);
    a.forEach((n, i) => expect(b[i]).toBeCloseTo(n, 14));
  });
  it('gives masked entries exactly zero', () =>
    expect(softmax([-Infinity, 4, -Infinity])).toEqual([0, 1, 0]));
  it('centers before dividing by a tiny temperature', () =>
    expect(softmax([1e300, 1e300 - 1e290], 1e-300)).toEqual([1, 0]));
  it.each([{ logits: [] }, { logits: [-Infinity] }, { logits: [NaN] }, { logits: [Infinity] }])(
    'rejects undefined distributions: $logits',
    ({ logits }) => expect(() => softmax(logits)).toThrow(),
  );
  it.each([0, -1, Infinity, NaN])('rejects temperature %s', (temperature) =>
    expect(() => softmax([1, 2], temperature)).toThrow(),
  );
});

describe('single-head self-attention', () => {
  it('matches a two-token hand calculation', () => {
    const { weights, output } = attention(
      [
        [1, 0],
        [0, 1],
      ],
      [
        [1, 0],
        [0, 1],
      ],
      [
        [10, 0],
        [0, 20],
      ],
    );
    expect(weights[0]).toEqual([1, 0]);
    expect(output[0]).toEqual([10, 0]);
    expect(weights[1][0]).toBeCloseTo(0.3302384506733431, 14);
    expect(output[1][0]).toBeCloseTo(3.302384506733431, 13);
    expect(output[1][1]).toBeCloseTo(13.395230986533137, 13);
  });
  it('permits value dimensions different from query/key dimensions', () => {
    expect(attention([[1, 0]], [[0, 1]], [[3, 5, 7]]).output).toEqual([[3, 5, 7]]);
  });
  it('prevents a future key and value perturbation from affecting past rows', () => {
    const { q, k, v } = ATTENTION_FIXTURE;
    const changedK = k.map((row) => [...row]),
      changedV = v.map((row) => [...row]);
    changedK[4] = [100, -100];
    changedV[4] = [800, -300];
    const baseline = attention(q, k, v),
      changed = attention(q, changedK, changedV);
    expect(changed.output.slice(0, 4)).toEqual(baseline.output.slice(0, 4));
    expect(changed.weights.slice(0, 4)).toEqual(baseline.weights.slice(0, 4));
  });
  it('allows future values to contribute when the mask is removed', () => {
    const { q, k, v } = ATTENTION_FIXTURE;
    const changed = v.map((row) => [...row]);
    changed[4][0] += 2.1;
    const baseline = attention(q, k, v, false),
      after = attention(q, k, changed, false);
    expect(after.output[2][0] - baseline.output[2][0]).toBeCloseTo(
      2.1 * baseline.weights[2][4],
      14,
    );
    expect(after.output[2][0]).not.toBe(baseline.output[2][0]);
  });
  it('preserves normalization and convex bounds over multiple vectors', () => {
    for (let seed = 1; seed < 30; seed++) {
      const q = Array.from({ length: 5 }, (_, i) => [Math.sin(seed + i), Math.cos(seed * i)]);
      for (const causal of [true, false]) {
        const result = attention(q, ATTENTION_FIXTURE.k, ATTENTION_FIXTURE.v, causal);
        result.weights.forEach((row, i) => {
          expect(row.reduce((a, b) => a + b)).toBeCloseTo(1, 14);
          row.forEach((p, j) => {
            expect(p).toBeGreaterThanOrEqual(0);
            if (causal && j > i) expect(p).toBe(0);
          });
          result.output[i].forEach((value, d) => {
            const visible = ATTENTION_FIXTURE.v.slice(0, causal ? i + 1 : 5).map((v) => v[d]);
            expect(value).toBeGreaterThanOrEqual(Math.min(...visible) - 1e-12);
            expect(value).toBeLessThanOrEqual(Math.max(...visible) + 1e-12);
          });
        });
      }
    }
  });
  it('rejects ragged matrices, mismatched dimensions, and non-finite values', () => {
    expect(() => attention([[1], [2, 3]], [[1], [2]], [[1], [2]])).toThrow();
    expect(() => attention([[1, 2]], [[1]], [[1]])).toThrow();
    expect(() => attention([[NaN]], [[1]], [[1]])).toThrow();
    expect(() => attention([], [], [])).toThrow();
    expect(() => attention([[1]], [[1], [2]], [[1], [2]])).toThrow();
    expect(() => attention([[1e308]], [[1e308]], [[1]])).toThrow();
  });
});
