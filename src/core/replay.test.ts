import { describe, expect, it } from 'vitest';
import { ATTENTION_FIXTURE, attention } from './attention';
import { BPE_CORPUS, createCorpus, stepBpe } from './bpe';
import { SAMPLING_LOGITS, distribution, sampleMany } from './sampling';
import { MAX_IMPORT_BYTES, parseReplay } from './replay';

const wrap = (experiment: string, data: unknown) =>
  JSON.stringify({ schemaVersion: 1, experiment, data });
const attentionData = () => ({ ...structuredClone(ATTENTION_FIXTURE), causal: false, selected: 4 });
const samplingData = () => ({
  logits: [...SAMPLING_LOGITS],
  options: { temperature: 0.7, topK: 3, topP: 0.8 },
  seed: 4294967295,
  count: 1000,
});
const bpeData = () => ({
  corpus: BPE_CORPUS,
  mode: 'word-based-unicode-code-points',
  tieBreak: 'json-pair-utf16-lexical',
  state: stepBpe(stepBpe(createCorpus(BPE_CORPUS))),
});

describe('replay preserves controls while recomputing outputs', () => {
  it('restores attention including future perturbation and ignores supplied results', () => {
    const data = attentionData();
    data.v[4][0] = 3;
    const restored = parseReplay(
      wrap('attention', { ...data, output: [[999]], weights: 'forged' }),
    );
    if (restored.experiment !== 'attention') throw new Error('wrong lab');
    expect(restored.input.future).toBe(true);
    expect(attention(restored.input.q, data.k, data.v, restored.input.causal)).toEqual(
      attention(data.q, data.k, data.v, data.causal),
    );
    expect(restored.input.selected).toBe(4);
  });
  it('replays seed, filters and sample count, ignoring supplied draws', () => {
    const data = samplingData(),
      restored = parseReplay(wrap('sampling', { ...data, draws: [999] }));
    if (restored.experiment !== 'sampling') throw new Error('wrong lab');
    const actual = restored.input;
    expect(
      sampleMany(
        distribution(actual.logits, actual.options).probabilities,
        actual.count,
        actual.seed,
      ),
    ).toEqual(
      sampleMany(distribution(data.logits, data.options).probabilities, data.count, data.seed),
    );
  });
  it.each([BPE_CORPUS, '😀a 😀a', 'aaaa aaa aa', '學習 學習 機器學習', ''])(
    'replays a bounded BPE history for %s',
    (corpus) => {
      const data = { ...bpeData(), corpus, state: stepBpe(stepBpe(createCorpus(corpus))) };
      const restored = parseReplay(wrap('bpe', data));
      expect(restored).toEqual({
        experiment: 'bpe',
        input: { corpus, steps: data.state.merges.length },
      });
    },
  );
});

describe('invalid imports leave no partially accepted controls', () => {
  it.each(['null', '[]', '{}', '{', '{"schemaVersion":2}', wrap('unknown', {})])(
    'rejects malformed or unsupported envelopes',
    (text) => expect(() => parseReplay(text)).toThrow(),
  );
  it('rejects oversized files before parsing', () =>
    expect(() => parseReplay(' '.repeat(MAX_IMPORT_BYTES + 1))).toThrow());
  it.each([
    { q: [[1, 2]] },
    { q: Array(5).fill([1, null]) },
    { q: Array(5).fill([1, 3]) },
    { k: Array(5).fill([0, 0]) },
    { v: Array(5).fill([0, 0]) },
    { selected: 5 },
    { selected: 0.5 },
    { causal: 'false' },
  ])('rejects unsupported attention controls %j', (patch) =>
    expect(() => parseReplay(wrap('attention', { ...attentionData(), ...patch }))).toThrow(),
  );
  it('rejects a JSON numeric overflow', () =>
    expect(() =>
      parseReplay(wrap('attention', attentionData()).replace('1.4', '1e400')),
    ).toThrow());
  it.each([
    { seed: null },
    { seed: -1 },
    { seed: 4294967296 },
    { count: 10001 },
    { count: 1.5 },
    { logits: [1] },
    { options: { temperature: 1, topK: 9, topP: 1 } },
    { options: { temperature: 1, topK: 0, topP: 0 } },
  ])('rejects invalid sampling controls %j', (patch) =>
    expect(() => parseReplay(wrap('sampling', { ...samplingData(), ...patch }))).toThrow(),
  );
  it('rejects altered merge rules and counts', () => {
    const data = bpeData();
    data.state.merges[0].count++;
    expect(() => parseReplay(wrap('bpe', data))).toThrow();
    data.state.merges[0].pair = ['x', 'y'];
    expect(() => parseReplay(wrap('bpe', data))).toThrow();
  });
  it.each([
    { corpus: 'x'.repeat(2001) },
    { mode: 'byte-level' },
    { tieBreak: 'random' },
    { state: { merges: Array(51).fill({}) } },
  ])('rejects incompatible BPE state %j', (patch) =>
    expect(() => parseReplay(wrap('bpe', { ...bpeData(), ...patch }))).toThrow(),
  );
});
