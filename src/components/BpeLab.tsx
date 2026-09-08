import { useMemo, useState } from 'react';
import { BPE_CORPUS, createCorpus, pairCounts, stepBpe, tokenCount } from '../core/bpe';
import { Check, Download, Readout } from './shared';
import type { Translate } from './shared';

export default function BpeLab({ t }: { t: Translate }) {
  const [corpus, setCorpus] = useState(BPE_CORPUS);
  const [draft, setDraft] = useState(BPE_CORPUS);
  const [steps, setSteps] = useState(0);
  const initial = useMemo(() => createCorpus(corpus), [corpus]);
  const state = useMemo(() => {
    let current = initial;
    for (let i = 0; i < steps; i++) current = stepBpe(current);
    return current;
  }, [initial, steps]);
  const pairs = pairCounts(state);
  const best = pairs[0];
  const initialCount = tokenCount(initial),
    currentCount = tokenCount(state);
  const pending = draft !== corpus;
  const presets = [
    { name: t('英文詞族', 'English word families'), text: BPE_CORPUS },
    {
      name: t('繁中詞族', 'Traditional Chinese'),
      text: '學習 學習 學習 機器學習 機器學習 深度學習 深度學習 學生 學校 語言模型 語言模型 模型',
    },
    { name: t('重疊配對', 'Overlapping pairs'), text: 'aaaa aaaa aaa aa' },
  ];
  const reset = () => setSteps(0);
  return (
    <div className="lab-content">
      <div className="section-intro">
        <div>
          <span className="eyebrow">03 / BYTE-PAIR ENCODING · CHARACTER DEMO</span>
          <h1>{t('字元，何時變成 token？', 'When do characters become tokens?')}</h1>
          <p>
            {t(
              '找出最常相鄰的一對符號，合併它們，再觀察整份語料如何改變。',
              'Find the most frequent adjacent pair, merge it, and watch the whole corpus change.',
            )}
          </p>
        </div>
        <span className="experiment-tag">
          {t('逐詞 · Unicode 字元示範', 'WORD-BASED · UNICODE DEMO')}
        </span>
      </div>
      <div className="workbench">
        <section
          className="instrument bpe-instrument"
          aria-label={t('BPE 合併實驗', 'BPE merge experiment')}
        >
          <div className="instrument-heading">
            <span className="status-dot" />
            {t('目前的切分', 'CURRENT SEGMENTATION')}
            <span className="instrument-meta">
              {t('合併步數', 'MERGE STEP')} {String(state.merges.length).padStart(2, '0')}
            </span>
          </div>
          <div className="bpe-words">
            {state.words.length ? (
              state.words.slice(0, 16).map((word) => (
                <div className="bpe-word" key={word.text}>
                  <div className="word-label">
                    <span>{word.text}</span>
                    <small>×{word.frequency}</small>
                  </div>
                  <div className="bpe-symbols">
                    {word.symbols.map((symbol, i) => (
                      <span
                        key={`${i}-${symbol}`}
                        className={`bpe-symbol ${Array.from(symbol).length > 1 ? 'merged' : ''} ${best && ((symbol === best.pair[0] && word.symbols[i + 1] === best.pair[1]) || (symbol === best.pair[1] && word.symbols[i - 1] === best.pair[0])) ? 'next-pair' : ''}`}
                      >
                        {symbol}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">
                {t('在右側輸入語料，開始觀察合併。', 'Enter a corpus in the controls to begin.')}
              </p>
            )}
          </div>
          {state.words.length > 16 && (
            <p className="instrument-note">
              {t(
                `顯示前 16 個不同詞；計算包含全部 ${state.words.length} 個。`,
                `Showing 16 unique words; calculations include all ${state.words.length}.`,
              )}
            </p>
          )}
          <div className="merge-action">
            <div>
              <span>
                {best
                  ? t('下一組合併', 'NEXT MERGE')
                  : t('沒有可合併的相鄰符號', 'NO ADJACENT PAIRS REMAIN')}
              </span>
              <strong>
                {best ? (
                  <>
                    <span>{best.pair[0]}</span> + <span>{best.pair[1]}</span> <i>→</i>{' '}
                    <span>{best.pair.join('')}</span>
                  </>
                ) : (
                  '—'
                )}
              </strong>
            </div>
            <button
              className="lime-button"
              disabled={!best || pending || steps >= 50}
              onClick={() => setSteps((n) => n + 1)}
            >
              {t('合併一步 →', 'Merge one step →')}
            </button>
          </div>
        </section>
        <aside className="control-panel">
          <div className="panel-heading">
            <h2>{t('訓練語料', 'Training corpus')}</h2>
            <button className="text-button" onClick={reset} disabled={!steps}>
              {t('重設合併', 'Reset merges')}
            </button>
          </div>
          <div className="preset-buttons">
            {presets.map((preset) => (
              <button
                className={preset.text === corpus ? 'active' : ''}
                key={preset.name}
                onClick={() => {
                  setCorpus(preset.text);
                  setDraft(preset.text);
                  setSteps(0);
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
          <label className="corpus-label">
            {t('以空白分隔詞，重複代表頻率', 'Separate words with spaces; repeat for frequency')}
            <textarea
              value={draft}
              rows={6}
              maxLength={2000}
              spellCheck={false}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <button
            className="primary-button"
            disabled={!pending}
            onClick={() => {
              setCorpus(draft);
              setSteps(0);
            }}
          >
            {t('套用語料並重新開始', 'Apply corpus and restart')}
          </button>
          {pending && (
            <p className="field-hint" role="status">
              {t(
                '語料尚未套用；套用後會清除目前合併。',
                'Changes are pending. Applying them resets the learned merges.',
              )}
            </p>
          )}
          <button
            className="outline-button"
            disabled={!steps}
            onClick={() => setSteps((n) => n - 1)}
          >
            {t('← 回到上一步', '← Undo last merge')}
          </button>
          {steps >= 50 && (
            <p className="field-hint">
              {t('已達本實驗 50 步上限。', 'The 50-step limit for this demo has been reached.')}
            </p>
          )}
          <p className="margin-note">
            {t(
              '這是逐詞、從 Unicode 字元開始的 BPE 教學版。空白只分隔詞，不計入 token；它不是 GPT 的 byte-level tokenizer。',
              'This teaching version starts from Unicode code points within words. Whitespace separates words and is not counted. It is not a GPT byte-level tokenizer.',
            )}
          </p>
        </aside>
      </div>
      <div className="reading-strip">
        <Readout
          label={t('初始符號總數', 'INITIAL SYMBOL COUNT')}
          note={t('依詞頻加權，不計空白', 'Weighted by frequency; excluding spaces')}
        >
          {initialCount}
        </Readout>
        <Readout label={t('目前符號總數', 'CURRENT SYMBOL COUNT')}>
          <span data-testid="bpe-token-count">{currentCount}</span>
        </Readout>
        <Readout label={t('已學合併規則', 'LEARNED MERGES')}>{state.merges.length}</Readout>
      </div>
      <div className="detail-grid">
        <section className="pairs-panel">
          <div className="panel-heading">
            <h2>{t('相鄰配對排行榜', 'Adjacent pair ranking')}</h2>
            <span>{t('顯示前 6 組', 'Top 6 pairs')}</span>
          </div>
          <table className="pairs-table">
            <thead>
              <tr>
                <th>{t('配對', 'Pair')}</th>
                <th>{t('加權出現次數', 'Weighted occurrences')}</th>
              </tr>
            </thead>
            <tbody>
              {pairs.slice(0, 6).map((pair, i) => (
                <tr key={JSON.stringify(pair.pair)} className={i === 0 ? 'best-pair' : ''}>
                  <td>
                    <code>
                      {pair.pair[0]} + {pair.pair[1]}
                    </code>
                    {i === 0 && <span> ← {t('下一組', 'next')}</span>}
                  </td>
                  <td>{pair.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pairs.length && (
            <p>
              {t(
                '每個詞已合併為一個符號，或語料為空。',
                'Every word is a single symbol, or the corpus is empty.',
              )}
            </p>
          )}
          <p className="small-note">
            {t(
              '統計包含重疊相鄰配對；實際合併由左至右、不重疊地替換。同次數時依配對的 JSON 字串 UTF-16 字典序決定。',
              'Counts include overlapping adjacent pairs; replacement is left-to-right and non-overlapping. Ties use UTF-16 lexical order of the JSON-encoded pair.',
            )}
          </p>
        </section>
        <section className="math-panel">
          <span className="eyebrow">{t('可重現的合併過程', 'A REPLAYABLE MERGE HISTORY')}</span>
          <h2>{t('每次只學一條規則', 'One rule at a time')}</h2>
          {state.merges.length ? (
            <ol className="merge-history">
              {state.merges.map((merge, i) => (
                <li key={i}>
                  <b>
                    <code>
                      {merge.pair[0]} + {merge.pair[1]} → {merge.pair.join('')}
                    </code>
                  </b>
                  <span>
                    {t(`當時出現 ${merge.count} 次`, `${merge.count} occurrences at that step`)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="small-note">
              {t(
                '點「合併一步」，這裡會保留每一步的規則與當時頻率。',
                'Choose “Merge one step” to record each rule and its frequency at that step.',
              )}
            </p>
          )}
          <Download
            t={t}
            name="bpe"
            data={{
              corpus,
              mode: 'word-based-unicode-code-points',
              tieBreak: 'json-pair-utf16-lexical',
              initialCount,
              currentCount,
              state,
            }}
          />
        </section>
      </div>
      <Check
        t={t}
        question={t(
          '這裡最常出現的配對，一定是完整的詞嗎？',
          'Is the most frequent pair always a whole word?',
        )}
        answers={[
          t('是，BPE 先理解詞義', 'Yes, BPE first understands word meanings'),
          t('不是，它只依符號相鄰頻率合併', 'No, it merges by adjacent-symbol frequency'),
        ]}
        correct={1}
        explanation={t(
          'BPE 使用頻率統計。合併結果可能是詞的一部分，也可能是整個詞；這個演算法不需要理解詞義。',
          'BPE uses frequency counts. A merged symbol may be part of a word or a whole word; the algorithm does not need to understand meaning.',
        )}
      />
    </div>
  );
}
