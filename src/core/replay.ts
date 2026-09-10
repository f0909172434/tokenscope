import { ATTENTION_FIXTURE } from './attention';
import { createCorpus, stepBpe } from './bpe';
import type { SamplingOptions } from './sampling';

export const MAX_IMPORT_BYTES = 1_000_000;
export type AttentionInput = { q: number[][]; causal: boolean; selected: number; future: boolean };
export type SamplingInput = {
  logits: number[];
  options: SamplingOptions;
  seed: number;
  count: number;
};
export type BpeInput = { corpus: string; steps: number };
export type Replay =
  | { experiment: 'attention'; input: AttentionInput }
  | { experiment: 'sampling'; input: SamplingInput }
  | { experiment: 'bpe'; input: BpeInput };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object');
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max: number, integer = false): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new Error('number');
  return value;
}
function vector(value: unknown, length: number, min: number, max: number): number[] {
  if (!Array.isArray(value) || value.length !== length) throw new Error('vector');
  return value.map((n) => number(n, min, max));
}
function matrix(value: unknown): number[][] {
  if (!Array.isArray(value) || value.length !== 5) throw new Error('matrix');
  return value.map((row) => vector(row, 2, -4, 4));
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Import controls only. Every displayed result is recomputed by the current lab. */
export function parseReplay(text: string): Replay {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error('size');
  const envelope = record(JSON.parse(text));
  if (envelope.schemaVersion !== 1) throw new Error('version');
  const data = record(envelope.data);
  if (envelope.experiment === 'attention') {
    const q = matrix(data.q).map((row) => row.map((n) => number(n, -2, 2)));
    const k = matrix(data.k),
      v = matrix(data.v);
    const perturbed = ATTENTION_FIXTURE.v.map((row) => [...row]);
    perturbed[4][0] = 3;
    if (!same(k, ATTENTION_FIXTURE.k) || (!same(v, ATTENTION_FIXTURE.v) && !same(v, perturbed)))
      throw new Error('fixture');
    if (typeof data.causal !== 'boolean') throw new Error('boolean');
    return {
      experiment: 'attention',
      input: {
        q,
        causal: data.causal,
        selected: number(data.selected, 0, 4, true),
        future: same(v, perturbed),
      },
    };
  }
  if (envelope.experiment === 'sampling') {
    const options = record(data.options);
    return {
      experiment: 'sampling',
      input: {
        logits: vector(data.logits, 8, -4, 4),
        options: {
          temperature: number(options.temperature, 0, 2),
          topK: number(options.topK, 0, 8, true),
          topP: number(options.topP, 0.05, 1),
        },
        seed: number(data.seed, 0, 0xffffffff, true),
        count: number(data.count, 0, 10000, true),
      },
    };
  }
  if (envelope.experiment === 'bpe') {
    if (
      typeof data.corpus !== 'string' ||
      data.corpus.length > 2000 ||
      data.mode !== 'word-based-unicode-code-points' ||
      data.tieBreak !== 'json-pair-utf16-lexical'
    )
      throw new Error('corpus');
    const history = record(data.state).merges;
    if (!Array.isArray(history) || history.length > 50) throw new Error('history');
    let state = createCorpus(data.corpus);
    for (const entry of history) {
      const merge = record(entry);
      const next = stepBpe(state);
      const expected = next.merges.at(-1);
      if (
        next === state ||
        !expected ||
        !same(merge.pair, expected.pair) ||
        merge.count !== expected.count
      )
        throw new Error('history');
      state = next;
    }
    return { experiment: 'bpe', input: { corpus: data.corpus, steps: history.length } };
  }
  throw new Error('experiment');
}
