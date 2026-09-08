export interface Word {
  text: string;
  frequency: number;
  symbols: string[];
}
export interface Pair {
  pair: [string, string];
  count: number;
}
export interface BpeState {
  words: Word[];
  merges: Pair[];
}

/** Word-based Unicode code-point BPE, deliberately not byte-level BPE. */
export function createCorpus(text: string): BpeState {
  if (text.length > 20000) throw new RangeError('Corpus is limited to 20,000 UTF-16 code units');
  const counts = new Map<string, number>();
  for (const word of text.match(/\S+/gu) ?? []) counts.set(word, (counts.get(word) ?? 0) + 1);
  return {
    words: [...counts].map(([word, frequency]) => ({
      text: word,
      frequency,
      symbols: Array.from(word),
    })),
    merges: [],
  };
}

export function pairCounts(state: BpeState): Pair[] {
  const pairs = new Map<string, Pair>();
  for (const { symbols, frequency } of state.words) {
    for (let i = 0; i < symbols.length - 1; i++) {
      const pair: [string, string] = [symbols[i], symbols[i + 1]];
      const key = JSON.stringify(pair);
      const entry = pairs.get(key);
      if (entry) entry.count += frequency;
      else pairs.set(key, { pair, count: frequency });
    }
  }
  return [...pairs.values()].sort((a, b) => {
    const left = JSON.stringify(a.pair),
      right = JSON.stringify(b.pair);
    return b.count - a.count || (left < right ? -1 : left > right ? 1 : 0);
  });
}

export function mergeSymbols(symbols: string[], [left, right]: [string, string]): string[] {
  const result: string[] = [];
  for (let i = 0; i < symbols.length; i++) {
    if (symbols[i] === left && symbols[i + 1] === right) {
      result.push(left + right);
      i++;
    } else result.push(symbols[i]);
  }
  return result;
}

export function stepBpe(state: BpeState): BpeState {
  const best = pairCounts(state)[0];
  if (!best) return state;
  return {
    words: state.words.map((word) => ({ ...word, symbols: mergeSymbols(word.symbols, best.pair) })),
    merges: [...state.merges, best],
  };
}

export function tokenCount(state: BpeState): number {
  return state.words.reduce((sum, word) => sum + word.symbols.length * word.frequency, 0);
}

/** Replay learned merge order on new words; whitespace is a boundary, not a token. */
export function encodeWords(text: string, merges: Pair[]): string[][] {
  if (text.length > 20000) throw new RangeError('Text is limited to 20,000 UTF-16 code units');
  return (text.match(/\S+/gu) ?? []).map((word) =>
    merges.reduce((symbols, merge) => mergeSymbols(symbols, merge.pair), Array.from(word)),
  );
}

export const BPE_CORPUS =
  'low low low low low lower lower newest newest newest newest newest newest widest widest widest';
