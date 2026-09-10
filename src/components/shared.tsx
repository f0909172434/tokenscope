import { useState } from 'react';
import type { ReactNode } from 'react';

export type Translate = (zh: string, en: string) => string;
export function fmt(n: number, digits = 3) {
  return n.toFixed(digits);
}
export function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function Download({
  data,
  name,
  t,
  disabled = false,
}: {
  data: unknown;
  name: string;
  t: Translate;
  disabled?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      className="text-button"
      disabled={disabled}
      onClick={() => {
        const blob = new Blob(
          [
            JSON.stringify(
              { schemaVersion: 1, experiment: name, data },
              (_, value) => (value === -Infinity ? null : value),
              2,
            ) + '\n',
          ],
          { type: 'application/json' },
        );
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `tokenscope-${name}.json`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setSaved(true);
      }}
    >
      {saved ? '✓ ' : '↓ '}
      {t('匯出實驗 JSON', 'Export experiment JSON')}
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  display?: string;
}) {
  return (
    <label className="slider-control">
      <span>
        {label}
        <span className="range-value">{display ?? value.toFixed(1)}</span>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}) {
  return (
    <label className="toggle-control">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true" />
    </label>
  );
}

export function Check({
  question,
  answers,
  correct,
  explanation,
  t,
}: {
  question: string;
  answers: string[];
  correct: number;
  explanation: string;
  t: Translate;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  return (
    <section className="concept-check">
      <div>
        <span className="eyebrow">{t('想一想', 'CHECK YOUR INTUITION')}</span>
        <h3>{question}</h3>
      </div>
      <div className="check-answers">
        {answers.map((answer, i) => (
          <button
            key={i}
            aria-pressed={chosen === i}
            className={chosen === i ? 'chosen' : ''}
            onClick={() => setChosen(i)}
          >
            {answer}
          </button>
        ))}
      </div>
      {chosen !== null && (
        <p role="status" className={chosen === correct ? 'correct' : 'try-again'}>
          {chosen === correct
            ? t('答對了。', 'Exactly. ')
            : t('再看一次實驗。', 'Look at the experiment again. ')}
          {explanation}
        </p>
      )}
    </section>
  );
}

export function Readout({
  label,
  children,
  note,
}: {
  label: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <div className="readout">
      <span>{label}</span>
      <strong>{children}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
