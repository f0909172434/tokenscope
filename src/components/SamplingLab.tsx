import { useState } from 'react';
import { distribution, sampleMany, SAMPLING_LOGITS } from '../core/sampling';
import type { SamplingOptions } from '../core/sampling';
import { Check, Download, fmt, pct, Readout, Slider } from './shared';
import type { Translate } from './shared';
import type { SamplingInput } from '../core/replay';

export default function SamplingLab({ t, initial }: { t: Translate; initial?: SamplingInput }) {
  const defaults: SamplingOptions = { temperature: 1, topK: 0, topP: 1 };
  const [options, setOptions] = useState(initial?.options ?? defaults);
  const [logits, setLogits] = useState(initial?.logits ?? [...SAMPLING_LOGITS]);
  const [seedText, setSeedText] = useState(String(initial?.seed ?? 42));
  const [count, setCount] = useState(initial?.count ?? 0);
  const seed = Number(seedText);
  const validSeed =
    /^\d+$/.test(seedText) && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff;
  const words = t(
    '小鳥,蝴蝶,窗外,樹梢,天空,月亮,魚,程式碼',
    'birds,butterflies,outside,treetops,sky,moon,fish,code',
  ).split(',');
  const result = distribution(logits, options);
  const draws = validSeed ? sampleMany(result.probabilities, count, seed) : [];
  const counts = words.map((_, i) => draws.filter((index) => index === i).length);
  const update = (change: Partial<SamplingOptions>) => {
    setOptions((current) => ({ ...current, ...change }));
    setCount(0);
  };
  const reset = () => {
    setOptions(defaults);
    setLogits([...SAMPLING_LOGITS]);
    setSeedText('42');
    setCount(0);
  };
  return (
    <div className="lab-content">
      <div className="section-intro">
        <div>
          <span className="eyebrow">02 / TOKEN SAMPLING</span>
          <h1>{t('下一個 token，怎麼選？', 'How do we choose the next token?')}</h1>
          <p>
            {t(
              '調整溫度與候選範圍，再用同一個種子重做取樣。',
              'Change the temperature and candidate set. Replay your samples with the same seed.',
            )}
          </p>
        </div>
        <span className="experiment-tag">
          {t('固定 logits · 獨立抽樣', 'FIXED LOGITS · IID DRAWS')}
        </span>
      </div>
      <div className="workbench">
        <section
          className="instrument sampling-instrument"
          aria-label={t('取樣機率分布', 'Sampling probability distribution')}
        >
          <div className="instrument-heading">
            <span className="status-dot" />
            {t('候選 token 機率', 'CANDIDATE PROBABILITIES')}
            <span className="instrument-meta">{t('亮色：篩選後', 'SOLID: AFTER FILTERING')}</span>
          </div>
          <div className="prompt-line">
            <span>{t('情境標籤', 'CONTEXT LABEL')}</span>
            {t('小 貓 正在 看', 'The curious cat watches')}
            <i>▌</i>
          </div>
          <div className="probability-bars">
            {words.map((word, i) => (
              <div
                key={i}
                className={`probability-row ${result.probabilities[i] === 0 ? 'excluded' : ''}`}
              >
                <span className="candidate-word">{word}</span>
                <div className="bar-track">
                  <div className="bar-original" style={{ width: `${result.base[i] * 100}%` }} />
                  <div
                    className="bar-filtered"
                    style={{ width: `${result.probabilities[i] * 100}%` }}
                  />
                </div>
                <strong>{pct(result.probabilities[i])}</strong>
                <span className="empirical-count">{count ? `${counts[i]}×` : '—'}</span>
              </div>
            ))}
          </div>
          <div className="bar-legend">
            <span>
              <i />
              {t('篩選前機率（已套用溫度）', 'Before filtering (after temperature)')}
            </span>
            <span>
              <i />
              {t('最終機率', 'Final probability')}
            </span>
          </div>
          <div className="sample-output">
            <span>{t('最近 24 次獨立抽樣', 'LAST 24 INDEPENDENT DRAWS')}</span>
            <div aria-live="polite" aria-atomic="true" className="draw-tokens">
              {draws.length ? (
                draws.slice(-24).map((index, i) => (
                  <span key={`${count - Math.min(count, 24) + i}`} className="draw-token">
                    {words[index]}
                  </span>
                ))
              ) : (
                <p>
                  {t('調好參數後，抽一個 token 試試。', 'Set the controls, then draw a token.')}
                </p>
              )}
            </div>
          </div>
        </section>
        <aside className="control-panel">
          <div className="panel-heading">
            <h2>{t('取樣控制', 'Sampling controls')}</h2>
            <button className="text-button" onClick={reset}>
              {t('重設', 'Reset')}
            </button>
          </div>
          <Slider
            label={t('溫度 T', 'Temperature T')}
            value={options.temperature}
            min={0}
            max={2}
            step={0.05}
            display={
              options.temperature === 0
                ? t('0 · 貪婪選擇', '0 · greedy')
                : fmt(options.temperature, 2)
            }
            onChange={(temperature) => update({ temperature })}
          />
          <Slider
            label="Top-k"
            value={options.topK}
            min={0}
            max={8}
            step={1}
            display={options.topK === 0 ? t('全部', 'All') : `${options.topK}`}
            onChange={(topK) => update({ topK })}
          />
          <Slider
            label="Top-p"
            value={options.topP}
            min={0.05}
            max={1}
            step={0.05}
            display={fmt(options.topP, 2)}
            onChange={(topP) => update({ topP })}
          />
          <label className="seed-input">
            {t('隨機種子', 'Random seed')}
            <input
              aria-invalid={!validSeed}
              inputMode="numeric"
              value={seedText}
              maxLength={10}
              onChange={(event) => {
                setSeedText(event.target.value);
                setCount(0);
              }}
            />
          </label>
          {!validSeed && (
            <p className="field-error" role="alert">
              {t('請輸入 0 到 4294967295 的整數。', 'Enter an integer from 0 to 4294967295.')}
            </p>
          )}
          <div className="draw-buttons">
            <button
              className="primary-button"
              disabled={!validSeed || count >= 10000}
              onClick={() => setCount((n) => n + 1)}
            >
              {t('抽下一個 ↗', 'Draw next ↗')}
            </button>
            <button className="outline-button" disabled={!validSeed} onClick={() => setCount(1000)}>
              {t('重做 1,000 次抽樣', 'Run 1,000 draws')}
            </button>
          </div>
          <p className="margin-note">
            {t(
              '這是在同一份固定 logits 上反覆獨立抽樣。每次抽樣之後不會更新上下文，因此這不是完整的自回歸生成器。',
              'These are independent draws from fixed logits. The context does not update after each draw; this is not a full autoregressive generator.',
            )}
          </p>
        </aside>
      </div>
      <div className="reading-strip">
        <Readout
          label={t('分布熵', 'DISTRIBUTION ENTROPY')}
          note={t('越高代表機率越分散', 'Higher means more spread out')}
        >
          {fmt(result.entropy, 2)} <em>bits</em>
        </Readout>
        <Readout label={t('非零候選', 'NONZERO CANDIDATES')}>
          {result.probabilities.filter((p) => p > 0).length} / 8
        </Readout>
        <Readout label={t('已抽樣', 'DRAWS')}>
          <span data-testid="sample-count">{draws.length.toLocaleString('en-US')}</span>
        </Readout>
      </div>
      <div className="detail-grid">
        <section className="logits-panel">
          <div className="panel-heading">
            <h2>{t('編輯原始 logits', 'Edit the raw logits')}</h2>
            <span>{t('手工設定的教學分數', 'Hand-set teaching scores')}</span>
          </div>
          <div className="logit-grid">
            {words.map((word, i) => (
              <Slider
                key={i}
                label={word}
                value={logits[i]}
                min={-4}
                max={4}
                onChange={(value) => {
                  setLogits((current) => current.map((n, j) => (i === j ? value : n)));
                  setCount(0);
                }}
              />
            ))}
          </div>
        </section>
        <section className="math-panel">
          <span className="eyebrow">{t('明確的處理順序', 'AN EXPLICIT ORDER')}</span>
          <h2 className="formula">pᵢ ∝ exp(logitᵢ / T)</h2>
          <ol>
            <li>
              <b>{t('溫度 → top-k', 'Temperature → top-k')}</b>
              <span>
                {t(
                  '先套用溫度，再保留分數最高的 k 個；k = 0 表示全部。',
                  'Apply temperature, then keep the k highest scores; k = 0 means all.',
                )}
              </span>
            </li>
            <li>
              <b>{t('重新正規化 → top-p', 'Renormalize → top-p')}</b>
              <span>
                {t(
                  '由高到低累加，保留包含越過 p 門檻那一項的最短前綴。',
                  'Keep the shortest descending prefix whose cumulative probability reaches p, including the crossing token.',
                )}
              </span>
            </li>
            <li>
              <b>{t('再次正規化 → 抽樣', 'Renormalize again → sample')}</b>
              <span>
                {t(
                  'T = 0 直接選最高分；同分時取索引較小者。',
                  'T = 0 selects the highest score directly; ties go to the lower index.',
                )}
              </span>
            </li>
          </ol>
          <Download
            t={t}
            name="sampling"
            disabled={!validSeed}
            data={{
              logits,
              options,
              seed: validSeed ? seed : null,
              count: draws.length,
              ...result,
              draws,
              counts,
            }}
          />
        </section>
      </div>
      <Check
        t={t}
        question={t(
          '把溫度拉高，最可能發生什麼？',
          'What usually happens when you raise the temperature?',
        )}
        answers={[
          t('篩選前的分布變得更平坦', 'The distribution before filtering becomes flatter'),
          t('模型會變得更正確', 'The model becomes more correct'),
        ]}
        correct={0}
        explanation={t(
          '對不全相等的固定 logits，溫度提高會拉近篩選前的機率；這不保證答案品質。',
          'For fixed unequal logits, higher temperature brings the pre-filter probabilities closer together. It does not guarantee better answers.',
        )}
      />
    </div>
  );
}
