export type Matrix = number[][];

export function validateMatrix(matrix: Matrix, name: string): void {
  if (
    !matrix.length ||
    !matrix[0].length ||
    matrix.some((row) => row.length !== matrix[0].length || row.some((n) => !Number.isFinite(n)))
  ) {
    throw new RangeError(`${name} must be a non-empty rectangular matrix of finite numbers`);
  }
}

/** Stable softmax. Negative infinity is reserved for masked entries. */
export function softmax(logits: number[], temperature = 1): number[] {
  if (!Number.isFinite(temperature) || temperature <= 0)
    throw new RangeError('Temperature must be positive');
  if (!logits.length || logits.some((n) => Number.isNaN(n) || n === Infinity))
    throw new RangeError('Invalid logits');
  const max = Math.max(...logits);
  if (max === -Infinity) throw new RangeError('At least one entry must be unmasked');
  const exps = logits.map((n) => Math.exp((n - max) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((n) => n / sum);
}

/** Single-head self-attention: softmax(QK^T / sqrt(d_k) + mask) V. */
export function attention(q: Matrix, k: Matrix, v: Matrix, causal = true) {
  validateMatrix(q, 'Q');
  validateMatrix(k, 'K');
  validateMatrix(v, 'V');
  if (q[0].length !== k[0].length || k.length !== v.length || q.length !== k.length) {
    throw new RangeError('Self-attention requires matching sequence lengths and Q/K dimensions');
  }
  const scale = Math.sqrt(q[0].length);
  const scores = q.map((row) =>
    k.map((key) => row.reduce((sum, value, d) => sum + value * key[d], 0) / scale),
  );
  if (scores.some((row) => row.some((n) => !Number.isFinite(n))))
    throw new RangeError('Dot product overflow');
  const maskedScores = scores.map((row, i) =>
    row.map((value, j) => (causal && j > i ? -Infinity : value)),
  );
  const weights = maskedScores.map((row) => softmax(row));
  const output = weights.map((row) =>
    v[0].map((_, d) => row.reduce((sum, weight, j) => sum + weight * v[j][d], 0)),
  );
  return { scores, maskedScores, weights, output };
}

export const ATTENTION_FIXTURE = {
  q: [
    [1, 0],
    [0.5, 1],
    [1.4, 0.8],
    [0, 1.5],
    [1.2, -0.5],
  ],
  k: [
    [0.5, 0.2],
    [0.3, 1.2],
    [1.5, 0.7],
    [-0.3, 1.4],
    [1.2, -0.8],
  ],
  v: [
    [0.1, 0.9],
    [0.8, 0.3],
    [1.0, 0.2],
    [0.2, 1.0],
    [0.9, -0.4],
  ],
};
