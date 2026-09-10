import { useEffect, useState } from 'react';
import AttentionLab from './components/AttentionLab';
import SamplingLab from './components/SamplingLab';
import BpeLab from './components/BpeLab';
import ImportExperiment from './components/ImportExperiment';
import type { AttentionInput, SamplingInput, BpeInput } from './core/replay';

const tabs = ['attention', 'sampling', 'bpe'] as const;
type Lab = (typeof tabs)[number];

export default function App() {
  const [replays, setReplays] = useState<{
    attention?: AttentionInput;
    sampling?: SamplingInput;
    bpe?: BpeInput;
  }>({});
  const [revisions, setRevisions] = useState({ attention: 0, sampling: 0, bpe: 0 });
  const [lang, setLang] = useState(() =>
    new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'zh-Hant',
  );
  const [active, setActive] = useState<Lab>(() =>
    tabs.includes(window.location.hash.slice(1) as Lab)
      ? (window.location.hash.slice(1) as Lab)
      : 'attention',
  );
  const t = (zh: string, en: string) => (lang === 'en' ? en : zh);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t('TokenScope — 語言模型實驗桌', 'TokenScope — A language model workbench');
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    url.hash = active;
    window.history.replaceState(null, '', url);
  }, [lang, active]);
  const labels = [t('注意力', 'Attention'), t('生成取樣', 'Sampling'), t('分詞合併', 'BPE merges')];
  return (
    <>
      <a className="skip-link" href="#main">
        {t('跳至實驗內容', 'Skip to experiment')}
      </a>
      <header className="site-header">
        <a
          className="brand"
          href="#attention"
          onClick={() => setActive('attention')}
          aria-label="TokenScope"
        >
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <path d="M5 8h26M18 8v24" />
            <circle cx="6" cy="29" r="2.5" />
            <circle cx="30" cy="29" r="2.5" />
          </svg>
          <span>
            TokenScope<small>{t('語言模型實驗桌', 'LANGUAGE MODEL WORKBENCH')}</small>
          </span>
        </a>
        <div className="header-actions">
          <span className="local-badge">
            <span />
            {t('在瀏覽器中運算', 'COMPUTES IN YOUR BROWSER')}
          </span>
          <button
            className="language-button"
            onClick={() => setLang((current) => (current === 'en' ? 'zh-Hant' : 'en'))}
            aria-label={t('Switch to English', '切換為繁體中文')}
          >
            {lang === 'en' ? '繁中' : 'EN'}
          </button>
          <a
            className="github-link"
            href="https://github.com/f0909172434/tokenscope"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </header>
      <main id="main">
        <div className="workbench-nav">
          <div
            className="lab-tabs"
            role="tablist"
            aria-label={t('選擇實驗', 'Choose an experiment')}
          >
            {tabs.map((id, i) => (
              <button
                id={`tab-${id}`}
                role="tab"
                aria-selected={active === id}
                aria-controls={`panel-${id}`}
                tabIndex={active === id ? 0 : -1}
                key={id}
                onClick={() => setActive(id)}
                onKeyDown={(event) => {
                  let next = i;
                  if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
                  else if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
                  else if (event.key === 'Home') next = 0;
                  else if (event.key === 'End') next = tabs.length - 1;
                  else return;
                  event.preventDefault();
                  setActive(tabs[next]);
                  document.getElementById(`tab-${tabs[next]}`)?.focus();
                }}
              >
                <span>0{i + 1}</span>
                {labels[i]}
                <i aria-hidden="true">↗</i>
              </button>
            ))}
          </div>
          <span className="edition">OPEN LAB / v0.2</span>
        </div>
        <ImportExperiment
          t={t}
          onImport={(replay) => {
            setReplays((current) => ({ ...current, [replay.experiment]: replay.input }));
            setRevisions((current) => ({
              ...current,
              [replay.experiment]: current[replay.experiment] + 1,
            }));
            setActive(replay.experiment);
          }}
        />
        <div
          id="panel-attention"
          role="tabpanel"
          aria-labelledby="tab-attention"
          hidden={active !== 'attention'}
        >
          <AttentionLab key={revisions.attention} initial={replays.attention} t={t} />
        </div>
        <div
          id="panel-sampling"
          role="tabpanel"
          aria-labelledby="tab-sampling"
          hidden={active !== 'sampling'}
        >
          <SamplingLab key={revisions.sampling} initial={replays.sampling} t={t} />
        </div>
        <div id="panel-bpe" role="tabpanel" aria-labelledby="tab-bpe" hidden={active !== 'bpe'}>
          <BpeLab key={revisions.bpe} initial={replays.bpe} t={t} />
        </div>
      </main>
      <footer>
        <div className="footer-brand">
          TokenScope<span>{t('小實驗，看清楚。', 'Small experiments. Visible mechanics.')}</span>
        </div>
        <div className="footer-notes">
          <p>
            {t(
              '獨立教育專案 · 手工範例 · 無帳號、無 API 金鑰、無追蹤程式',
              'Independent educational project · Hand-set examples · No account, API key, or analytics',
            )}
          </p>
          <p>
            {t('參考原始文獻：', 'Original references: ')}
            <a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noreferrer">
              Attention
            </a>{' '}
            ·{' '}
            <a href="https://arxiv.org/abs/1904.09751" target="_blank" rel="noreferrer">
              Nucleus sampling
            </a>{' '}
            ·{' '}
            <a href="https://arxiv.org/abs/1508.07909" target="_blank" rel="noreferrer">
              BPE
            </a>
          </p>
          <p>
            <a
              href="https://github.com/f0909172434/tokenscope/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
            >
              MIT License
            </a>{' '}
            · Chih-Kai Wang
          </p>
        </div>
      </footer>
    </>
  );
}
