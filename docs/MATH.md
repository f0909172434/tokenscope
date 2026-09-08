# Numerical conventions

## Attention

For a sequence of length `n`, `Q` and `K` have shape `n × d_k`, and `V` has shape `n × d_v`:

```text
score[i,j]  = dot(Q[i], K[j]) / sqrt(d_k)
mask[i,j]   = -Infinity if causal and j > i, else 0
weight[i,:] = softmax(score[i,:] + mask[i,:])
output[i]   = sum_j weight[i,j] * V[j]
```

Softmax subtracts the maximum before exponentiation. Masked entries have exactly zero weight. Completely masked rows are rejected. The API implements self-attention, so sequence lengths must match; value dimensions can differ from query/key dimensions.

The future perturbation changes only `V[4][0]` from `0.9` to `3.0`. The displayed delta compares the selected output's first component against the unperturbed V under the **same current Q and mask**. Therefore, with the mask enabled, positions 0 through 3 have zero delta; the last position may change because the perturbation is not future information for itself.

The heatmap displays rounded weights; their displayed sum can differ from one due to rounding. The total readout uses full-precision weights. Line thickness is `1.5 + 11 × weight` for visible edges and is a visual cue, not a second probability scale.

### Hand-computable fixture

With `Q = K = [[1,0],[0,1]]`, `V = [[10,0],[0,20]]`, and causal masking:

- First output: `[10,0]`.
- Second weights: `[1/(1+exp(1/sqrt(2))), exp(1/sqrt(2))/(1+exp(1/sqrt(2)))]`.
- Second output: approximately `[3.302384506733431, 13.395230986533137]`.

## Sampling

For `T > 0`, the exact order is:

1. Stable softmax of `logits / T`.
2. Retain top-k logits; `k = 0` means no top-k filtering.
3. Renormalize the retained probabilities.
4. Sort descending and retain the shortest prefix reaching `top_p`, **including** the crossing token.
5. Renormalize again and sample from the resulting categorical distribution.

`top_p = 1` retains every top-k candidate. Ties are broken by original index. `T = 0` is explicitly defined as greedy argmax, with the lowest index winning ties. Invalid temperatures, probability cutoffs, and k values are rejected.

Entropy is Shannon entropy in bits: `-sum(p * log2(p))`, with `0 log 0 = 0`. The UI labels nonzero candidates, which may differ from the number retained if floating-point underflow produces zeros.

The PRNG is Mulberry32 with a uint32 seed. It is deterministic and suitable for this teaching experiment, not cryptography. Categorical CDF intervals are half-open. The UI replays from the beginning for “Run 1,000 draws”; “Draw next” extends that sequence by one. Changing distribution inputs or seed clears the draw history.

## BPE

- Input is split on Unicode whitespace into words. Repeated words contribute frequency weights.
- Initial symbols are JavaScript `Array.from(word)`, i.e. Unicode code points. Grapheme clusters may contain several code points; no Unicode normalization is applied.
- Adjacent-pair counts include overlapping occurrences. For example `aaaa` has three `a + a` occurrences.
- Each step merges the most frequent pair by non-overlapping left-to-right replacement. `aaaa` therefore becomes `aa | aa`, reducing the count by two, not three.
- Frequency ties use lexical comparison of `JSON.stringify(pair)` by UTF-16 code units. This is independent of the browser's locale.
- There are no end-of-word markers, byte preprocessing, or cross-word merges.
- Symbol counts are weighted by word frequency and exclude whitespace. They are not byte compression ratios.

`encodeWords` replays learned merges on new words in their original order, preserving repetitions, and returns one symbol array per word. It does not preserve whitespace layout or represent a production tokenizer vocabulary.

## JSON exports

Exports use `{ "schemaVersion": 1, "experiment": "attention" | "sampling" | "bpe", "data": ... }`.

- **Attention:** input Q/K/V, mask setting, selected zero-based position, scores, masked scores, weights, and output. Masked `-Infinity` values are serialized as `null` because JSON cannot represent infinity.
- **Sampling:** logits, filter settings, seed, draw count, pre-filter/final probabilities, kept indices, entropy, drawn indices, and per-token counts. An invalid seed is represented as `null` with no draws.
- **BPE:** original corpus, mode and tie-break labels, weighted symbol counts, segmented words with frequencies, and every learned merge with its count at that step.

Numbers use JavaScript double precision. Exports are intended for inspection and reimplementation; v0.1 has no import UI.
