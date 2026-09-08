import { useState } from 'react';
import { attention, ATTENTION_FIXTURE } from '../core/attention';
import { Check, Download, fmt, pct, Readout, Slider, Toggle } from './shared';
import type { Translate } from './shared';

const copyMatrix = (m: number[][]) => m.map((row) => [...row]);

export default function AttentionLab({ t }: { t: Translate }) {
  const [selected, setSelected] = useState(2);
  const [causal, setCausal] = useState(true);
  const [q, setQ] = useState(() => copyMatrix(ATTENTION_FIXTURE.q));
  const [future, setFuture] = useState(false);
  const [guide, setGuide] = useState(-1);
  const words = t('小,貓,正在,看,小鳥', 'The,curious,cat,watches,birds').split(',');
  const v = copyMatrix(ATTENTION_FIXTURE.v);
  if (future) v[4][0] = 3;
  const result = attention(q, ATTENTION_FIXTURE.k, v, causal);
  const original = attention(q, ATTENTION_FIXTURE.k, ATTENTION_FIXTURE.v, causal);
  const row = result.weights[selected];
  const delta = result.output[selected][0] - original.output[selected][0];
  const reset = () => {
    setSelected(2);
    setCausal(true);
    setQ(copyMatrix(ATTENTION_FIXTURE.q));
    setFuture(false);
    setGuide(-1);
  };
  const guideTexts = [
    t(
      '選第一個 token。它只能讀取自己，所以權重必定是 100%。',
      'Start with the first token. It can read only itself, so its weight must be 100%.',
    ),
    t(
      '移到第三個 token。它能混合自己和前面兩個位置的 V。',
      'Move to the third token. It can mix its own V with the two preceding positions.',
    ),
    t(
      '現在拿掉因果遮罩。右邊尚未生成的 token 也會參與計算。',
      'Remove the causal mask. Future positions now contribute to the calculation.',
    ),
    t(
      '恢復遮罩，並改變最後一個 V。第三個位置的輸出保持不變。',
      'Restore the mask and change the last V. The output at the third position stays unchanged.',
    ),
  ];
  const nextGuide = () => {
    const next = guide + 1;
    if (next > 3) {
      setGuide(-1);
      return;
    }
    setGuide(next);
    setSelected(next === 0 ? 0 : 2);
    setCausal(next !== 2);
    setFuture(next === 3);
    setQ(copyMatrix(ATTENTION_FIXTURE.q));
  };
  return (
    <div className="lab-content">
      <div className="section-intro">
        <div>
          <span className="eyebrow">01 / SCALED DOT-PRODUCT ATTENTION</span>
          <h1>{t('一個 token，能看見什麼？', 'What can a token see?')}</h1>
          <p>
            {t(
              '點選一個查詢位置，追蹤它如何把其他位置的資訊混合成輸出。',
              'Choose a query position. Follow how it mixes information from other positions into an output.',
            )}
          </p>
        </div>
        <button className="outline-button" onClick={nextGuide}>
          {guide < 0
            ? t('帶我走一遍 ↗', 'Walk me through ↗')
            : guide === 3
              ? t('完成導覽 ✓', 'Finish walkthrough ✓')
              : t('下一步 →', 'Next step →')}
        </button>
      </div>
      {guide >= 0 && (
        <div className="guide" role="status">
          <b>0{guide + 1} / 04</b>
          <p>{guideTexts[guide]}</p>
          <button aria-label={t('關閉導覽', 'Close walkthrough')} onClick={() => setGuide(-1)}>
            ×
          </button>
        </div>
      )}
      <div className="workbench">
        <section
          className="instrument attention-instrument"
          aria-label={t('Attention 資訊流', 'Attention information flow')}
        >
          <div className="instrument-heading">
            <span className="status-dot" />
            {t('單一注意力頭', 'SINGLE ATTENTION HEAD')}
            <span className="instrument-meta">n = 5 · dₖ = 2 · dᵥ = 2</span>
          </div>
          <div className="instrument-summary">
            <span>{t('輸出向量', 'OUTPUT VECTOR')}</span>
            <strong data-testid="attention-output">
              [{result.output[selected].map((n) => fmt(n)).join(', ')}]
            </strong>
            <small>Σⱼ attentionⱼ · Vⱼ</small>
          </div>
          <div className="token-selector" aria-label={t('選擇查詢 token', 'Choose query token')}>
            {words.map((word, i) => (
              <button
                key={i}
                aria-pressed={selected === i}
                onClick={() => {
                  setSelected(i);
                  setGuide(-1);
                }}
              >
                <small>Q{i + 1}</small>
                {word}
              </button>
            ))}
          </div>
          <svg
            className="signal-map"
            viewBox="0 0 700 220"
            role="img"
            aria-label={t(
              `查詢位置 ${selected + 1} 的注意力權重：${row.map(pct).join('、')}`,
              `Query position ${selected + 1} attention weights: ${row.map(pct).join(', ')}`,
            )}
          >
            <defs>
              <pattern id="signal-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.75" fill="#ffffff" opacity="0.12" />
              </pattern>
            </defs>
            <rect width="700" height="220" fill="url(#signal-grid)" />
            {row.map((weight, j) => (
              <g key={j} className={weight === 0 ? 'signal-off' : 'signal-on'}>
                <path
                  className="signal-path"
                  d={`M ${70 + selected * 140},8 C ${70 + selected * 140},95 ${70 + j * 140},90 ${70 + j * 140},170`}
                  stroke={weight === 0 ? '#788b7e' : '#c9ed83'}
                  opacity={weight === 0 ? 0.18 : 0.25 + weight * 0.75}
                  strokeWidth={weight === 0 ? 1 : 1.5 + weight * 11}
                  strokeDasharray={weight === 0 ? '3 6' : undefined}
                  fill="none"
                />
                <circle
                  cx={70 + j * 140}
                  cy="173"
                  r={weight === 0 ? 4 : 5 + weight * 9}
                  fill={weight === 0 ? '#6d7a70' : '#c9ed83'}
                />
                <text
                  x={70 + j * 140}
                  y="207"
                  textAnchor="middle"
                  fill={weight === 0 ? '#a9b6ac' : '#e8f5d7'}
                >
                  {pct(weight)}
                </text>
              </g>
            ))}
            <circle cx={70 + selected * 140} cy="8" r="5" fill="#c9ed83" />
          </svg>
          <div className="value-row">
            {v.map((vector, j) => (
              <div key={j} className={row[j] === 0 ? 'muted' : ''}>
                <span>
                  K{j + 1} → V{j + 1}
                </span>
                <strong>[{vector.map((n) => fmt(n, 1)).join(', ')}]</strong>
              </div>
            ))}
          </div>
        </section>
        <aside className="control-panel">
          <div className="panel-heading">
            <h2>{t('實驗設定', 'Experiment controls')}</h2>
            <button className="text-button" onClick={reset}>
              {t('重設', 'Reset')}
            </button>
          </div>
          <Toggle
            label={t('因果遮罩', 'Causal mask')}
            checked={causal}
            onChange={(value) => {
              setCausal(value);
              setGuide(-1);
            }}
            description={t('只讀取目前與過去的位置', 'Read only current and earlier positions')}
          />
          <div className="control-group">
            <span className="eyebrow">{t(`調整 Q${selected + 1}`, `ADJUST Q${selected + 1}`)}</span>
            {[0, 1].map((d) => (
              <Slider
                key={d}
                label={`Q${selected + 1}[${d}]`}
                value={q[selected][d]}
                min={-2}
                max={2}
                onChange={(value) =>
                  setQ((current) =>
                    current.map((r, i) =>
                      i === selected ? r.map((n, dimension) => (dimension === d ? value : n)) : r,
                    ),
                  )
                }
              />
            ))}
          </div>
          <Toggle
            label={t('擾動最後一個 V', 'Perturb the last V')}
            checked={future}
            onChange={setFuture}
            description="V₅[0]: 0.9 → 3.0"
          />
          <div className="delta-readout">
            <span>{t('輸出第 1 維的變化', 'Change in output dimension 1')}</span>
            <strong data-testid="attention-delta">
              {delta >= 0 ? '+' : ''}
              {fmt(delta)}
            </strong>
            <small>
              {t('相對於相同設定、未擾動的 V', 'Relative to the same settings with the original V')}
            </small>
          </div>
          <p className="margin-note">
            {t(
              '這些是手工設定的二維向量，用來檢查計算；詞語標籤不代表模型學到的語意。',
              'These hand-set 2D vectors expose the arithmetic. The word labels do not represent learned semantics.',
            )}
          </p>
        </aside>
      </div>
      <div className="detail-grid">
        <section className="matrix-panel">
          <div className="panel-heading">
            <h2>{t('完整權重矩陣', 'Full attention matrix')}</h2>
            <span>{t('每列加總為 1', 'Every row sums to 1')}</span>
          </div>
          <div className="table-scroll">
            <table className="attention-table">
              <caption>
                {t(
                  '列是 Q，欄是 K。點選一列切換查詢。',
                  'Rows are Q; columns are K. Select a row to change the query.',
                )}
              </caption>
              <thead>
                <tr>
                  <th>Q ↓ K →</th>
                  {words.map((w, i) => (
                    <th key={i}>{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.weights.map((weights, i) => (
                  <tr key={i} className={i === selected ? 'selected-row' : ''}>
                    <th>
                      <button
                        aria-label={t(`選擇第 ${i + 1} 列`, `Select row ${i + 1}`)}
                        onClick={() => setSelected(i)}
                      >
                        {words[i]}
                      </button>
                    </th>
                    {weights.map((value, j) => (
                      <td
                        key={j}
                        style={{ backgroundColor: `rgba(108, 147, 52, ${value * 0.7})` }}
                        title={`${fmt(result.scores[i][j], 4)} → ${fmt(value, 6)}`}
                      >
                        {causal && j > i ? <span className="masked">—</span> : fmt(value, 2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="math-panel">
          <span className="eyebrow">{t('追蹤這一次計算', 'TRACE THIS COMPUTATION')}</span>
          <h2 className="formula">softmax(QKᵀ / √dₖ + M)V</h2>
          <ol>
            <li>
              <b>
                Q{selected + 1} = [{q[selected].map((n) => fmt(n, 1)).join(', ')}]
              </b>
              <span>{t('與每個 K 內積，再除以 √2。', 'Dot with each K, then divide by √2.')}</span>
            </li>
            <li>
              <b>{t('套用遮罩，接著 softmax', 'Apply the mask, then softmax')}</b>
              <span>
                {t(
                  '被遮住的分數設為 −∞，權重精確為 0。',
                  'Masked scores become −∞, giving exactly zero weight.',
                )}
              </span>
            </li>
            <li>
              <b>{t('依權重加總 V', 'Take a weighted sum of V')}</b>
              <span>
                {t(
                  '權重大的位置，對輸出貢獻更多。',
                  'A larger weight gives that position more contribution.',
                )}
              </span>
            </li>
          </ol>
          <Download
            t={t}
            name="attention"
            data={{ q, k: ATTENTION_FIXTURE.k, v, causal, selected, ...result }}
          />
          <details>
            <summary>{t('查看 K 與本列分數', 'Inspect K and row scores')}</summary>
            <pre>
              {ATTENTION_FIXTURE.k
                .map(
                  (key, i) =>
                    `K${i + 1} [${key.join(', ')}] → ${causal && i > selected ? '−∞ (masked)' : fmt(result.scores[selected][i], 4)}`,
                )
                .join('\n')}
            </pre>
          </details>
        </section>
      </div>
      <div className="reading-strip">
        <Readout label={t('可讀取位置', 'VISIBLE POSITIONS')}>
          {row.filter((w) => w > 0).length} / 5
        </Readout>
        <Readout label={t('本列權重總和', 'ROW WEIGHT SUM')}>
          {fmt(
            row.reduce((a, b) => a + b),
            3,
          )}
        </Readout>
        <p>
          {t(
            '試試看：選第三個 token、開啟遮罩，再擾動最後一個 V。輸出有變嗎？接著關閉遮罩，比較結果。',
            'Try this: choose the third token, enable the mask, and perturb the last V. Does the output change? Then disable the mask and compare.',
          )}
        </p>
      </div>
      <Check
        t={t}
        question={t(
          '遮罩開啟時，改變未來位置的 V 會影響目前輸出嗎？',
          'With the causal mask on, can a future V change the current output?',
        )}
        answers={[
          t('會，所有 token 都會參與', 'Yes, every token contributes'),
          t('不會，未來位置的權重為 0', 'No, future positions have zero weight'),
        ]}
        correct={1}
        explanation={t(
          '在這個 attention 頭中，未來位置的 V 乘上 0，因此不貢獻到目前輸出。',
          'In this attention head, a future V is multiplied by zero and contributes nothing to the current output.',
        )}
      />
    </div>
  );
}
