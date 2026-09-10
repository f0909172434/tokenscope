# Save and replay an experiment

Export the JSON from any lab. After a refresh, choose **Import experiment JSON**. The lab restores controls, opens the matching tab, and recomputes every result. The file stays in your browser; it is not uploaded. Other labs keep their current state.

The importer accepts existing schema-version 1 exports, up to 1 MB:

- Attention: five two-dimensional Q vectors, query index, causal mask, and the original or perturbed V fixture. K and the remaining V values must match the lab's fixed fixture.
- Sampling: eight logits, temperature, top-k, top-p, uint32 seed and up to 10,000 independent draws. Enter a valid seed before exporting.
- BPE: up to 2,000 UTF-16 code units and 50 deterministic merges. The Unicode word-based mode, tie-break rule, merge pairs and frequencies are checked against a fresh replay.

Stored numerical outputs are never accepted as computational evidence. Weights, probabilities, draws and word segmentation are recalculated; invalid input leaves the existing experiment unchanged. Unsupported schema versions, dimensions, non-finite numbers, out-of-range controls and altered BPE history are rejected. This is a replay format for these three educational labs, not an arbitrary tensor or tokenizer format.

For a learning route, explore the attention and BPE controls, then continue to [MiniHarness's AI engineering curriculum](https://github.com/f0909172434/miniharness/tree/main/academy). Its [eight-step agent workshop](https://github.com/f0909172434/miniharness/tree/main/tutorial) can also be taken directly.

## 繁體中文

在任一實驗匯出 JSON，重新整理後點選「匯入實驗 JSON」，即可恢復設定並重新計算。檔案只在瀏覽器內讀取，不會上傳；其他分頁的實驗保持原狀。

接受既有第 1 版格式，上限 1 MB。注意力實驗保留固定的 K／V 範例；取樣保存 seed、篩選設定與抽樣次數；BPE 依原語料重播每一步並檢查配對與頻率。格式、向量尺寸、數值或合併紀錄不符時，原實驗保持不變。匯入檔中的結果不會直接成為畫面上的答案。
