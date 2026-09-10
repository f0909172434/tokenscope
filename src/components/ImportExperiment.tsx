import { useRef, useState } from 'react';
import { MAX_IMPORT_BYTES, parseReplay } from '../core/replay';
import type { Replay } from '../core/replay';
import type { Translate } from './shared';

export default function ImportExperiment({
  t,
  onImport,
}: {
  t: Translate;
  onImport: (replay: Replay) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle');
  return (
    <div className="import-controls">
      <button className="text-button" onClick={() => fileInput.current?.click()}>
        {t('↑ 匯入實驗 JSON', '↑ Import experiment JSON')}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label={t('選擇實驗 JSON', 'Choose experiment JSON')}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const current = ++request.current;
          setStatus('idle');
          try {
            if (file.size > MAX_IMPORT_BYTES) throw new Error('size');
            const replay = parseReplay(await file.text());
            if (current !== request.current) return;
            onImport(replay);
            setStatus('done');
          } catch {
            if (current === request.current) setStatus('error');
          }
        }}
      />
      {status === 'done' && (
        <p role="status">
          {t('已恢復設定並重新計算。', 'Controls restored and results recomputed.')}
        </p>
      )}
      {status === 'error' && (
        <p role="alert">
          {t(
            '無法匯入。請選擇有效的 TokenScope v1 JSON（上限 1 MB）；設定、固定向量與合併紀錄必須符合此版本。原實驗保持不變。',
            'Could not import. Choose a valid TokenScope v1 JSON file (up to 1 MB) with supported controls, fixed vectors, and merge history. Your experiment is unchanged.',
          )}
        </p>
      )}
    </div>
  );
}
