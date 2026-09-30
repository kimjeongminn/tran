'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export type Preferences = { large: boolean; rate: 0.75 | 1; autoRead: boolean };
export const defaultPreferences: Preferences = { large: false, rate: 0.75, autoRead: false };
export function Settings({ open, onClose, value, onChange }: { open: boolean; onClose(): void; value: Preferences; onChange(value: Preferences): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="settings-title">
    <div className="dialog-heading"><h2 id="settings-title">나에게 맞추기</h2><button className="quiet" onClick={onClose}><X aria-hidden="true" size={22} /> 닫기</button></div>
    <fieldset><legend>글씨 크기</legend><div className="choices">{[false, true].map(large => <button key={String(large)} aria-pressed={value.large === large} onClick={() => onChange({ ...value, large })}>{large ? '더 크게' : '크게'}</button>)}</div></fieldset>
    <fieldset><legend>읽는 속도</legend><div className="choices">{([0.75, 1] as const).map(rate => <button key={rate} aria-pressed={value.rate === rate} onClick={() => onChange({ ...value, rate })}>{rate === 0.75 ? '천천히 · 0.75배' : '보통 · 1배'}</button>)}</div></fieldset>
    <label className="toggle"><span>결과가 나오면 바로 읽기</span><input type="checkbox" checked={value.autoRead} onChange={e => onChange({ ...value, autoRead: e.target.checked })} /></label>
    <p className="muted">설정은 이 기기에만 저장돼요.</p><button className="primary full" onClick={onClose}>설정 마치기</button>
  </dialog>;
}
