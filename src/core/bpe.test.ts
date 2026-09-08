import { describe, expect, it } from 'vitest';
import {
  BPE_CORPUS,
  createCorpus,
  encodeWords,
  mergeSymbols,
  pairCounts,
  stepBpe,
  tokenCount,
} from './bpe';

describe('word-based Unicode BPE', () => {
  it('aggregates word frequencies without crossing whitespace', () => {
    const corpus = createCorpus('ab ab\nac\t字');
    expect(corpus.words.map((w) => [w.text, w.frequency])).toEqual([
      ['ab', 2],
      ['ac', 1],
      ['字', 1],
    ]);
    expect(pairCounts(corpus)).toEqual([
      { pair: ['a', 'b'], count: 2 },
      { pair: ['a', 'c'], count: 1 },
    ]);
    expect(tokenCount(corpus)).toBe(7);
  });
  it('starts from code points instead of UTF-16 halves', () => {
    expect(createCorpus('😀a').words[0].symbols).toEqual(['😀', 'a']);
    expect(tokenCount(createCorpus('😀a'))).toBe(2);
  });
  it('preserves punctuation and treats markup as ordinary text', () => {
    const corpus = createCorpus('<b> a,b');
    expect(corpus.words.map((w) => w.symbols.join(''))).toEqual(['<b>', 'a,b']);
  });
  it('counts overlaps but replaces them non-overlapping from the left', () => {
    const corpus = createCorpus('aaaa aaaa');
    expect(pairCounts(corpus)[0]).toEqual({ pair: ['a', 'a'], count: 6 });
    expect(stepBpe(corpus).words[0].symbols).toEqual(['aa', 'aa']);
    expect(tokenCount(stepBpe(corpus))).toBe(4);
  });
  it('uses deterministic JSON lexical tie-breaking', () => {
    expect(pairCounts(createCorpus('bc ab'))[0].pair).toEqual(['a', 'b']);
  });
  it('preserves the input and learned history immutably', () => {
    const before = createCorpus('low low lower');
    const json = JSON.stringify(before),
      after = stepBpe(before);
    expect(JSON.stringify(before)).toBe(json);
    expect(after.merges).toHaveLength(1);
  });
  it('reconstructs the corpus and decreases symbol count at every merge', () => {
    let state = createCorpus(BPE_CORPUS);
    for (let i = 0; i < 100 && pairCounts(state).length; i++) {
      const next = stepBpe(state);
      expect(tokenCount(next)).toBeLessThan(tokenCount(state));
      next.words.forEach((w, j) => {
        expect(w.symbols.join('')).toBe(state.words[j].text);
        expect(w.frequency).toBe(state.words[j].frequency);
      });
      state = next;
    }
    expect(state.words.every((w) => w.symbols.length === 1)).toBe(true);
    expect(stepBpe(state)).toBe(state);
  });
  it('replays merge order on unseen words and preserves repeated-word order', () => {
    const trained = stepBpe(createCorpus('ab ab ac'));
    expect(encodeWords('ab cab ab', trained.merges)).toEqual([['ab'], ['c', 'ab'], ['ab']]);
  });
  it('merges multi-character symbols as one learned pair', () =>
    expect(mergeSymbols(['lo', 'w', 'lo', 'w'], ['lo', 'w'])).toEqual(['low', 'low']));
  it('handles empty and single-symbol corpora', () => {
    expect(createCorpus(' \n\t').words).toEqual([]);
    expect(pairCounts(createCorpus('a a 字'))).toEqual([]);
    expect(tokenCount(createCorpus(''))).toBe(0);
  });
  it('bounds input size', () => {
    expect(() => createCorpus('a'.repeat(20001))).toThrow();
    expect(() => encodeWords('a'.repeat(20001), [])).toThrow();
  });
});
