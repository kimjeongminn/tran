'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioLines, Mic, Settings2, Keyboard, ShieldCheck, Square, Volume2, RotateCcw, TriangleAlert, LoaderCircle, ChevronDown } from 'lucide-react';
import { useSpeechInput } from '@/hooks/use-speech-input';
import { spokenResult, validateResult, type EasyResult } from '@/lib/result';
import { Settings, defaultPreferences, type Preferences } from './settings';
import { ResultCards } from './result-cards';
type Stage = 'home' | 'processing' | 'result' | 'error';
export function EasyWordsApp({ config }: { config: { enabled: boolean; notice?: string } }) {
  const [stage, setStage] = useState<Stage>('home');
  const [original, setOriginal] = useState('');
  const [result, setResult] = useState<EasyResult | null>(null);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [reading, setReading] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [speechMessage, setSpeechMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  const prefs = useRef(preferences); prefs.current = preferences;
  const main = useRef<HTMLElement>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const stopReading = useCallback(() => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); setReading(false); }, []);
  const read = useCallback((data: EasyResult) => {
    setSpeechMessage('');
    if (!('speechSynthesis' in window)) { setSpeechMessage('이 기기에서는 소리로 읽을 수 없어요. 화면의 글을 확인해 주세요.'); return; }
    window.speechSynthesis.cancel();
    const message = new SpeechSynthesisUtterance(spokenResult(data));
    message.lang = 'ko-KR'; message.rate = prefs.current.rate;
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('ko'));
    if (voice) message.voice = voice;
    message.onstart = () => setReading(true);
    message.onend = () => setReading(false);
    message.onerror = event => { setReading(false); if (!['canceled', 'interrupted'].includes(event.error)) setSpeechMessage('소리로 읽지 못했어요. 쉬운 말 듣기를 다시 눌러주세요.'); };
    utterance.current = message; window.speechSynthesis.speak(message);
  }, []);
  useEffect(() => {
    setSpeechAvailable('speechSynthesis' in window);
    try {
      const saved = JSON.parse(localStorage.getItem('easy-words-preferences-v1') || 'null');
      if (saved && typeof saved.large === 'boolean' && [0.75, 1].includes(saved.rate) && typeof saved.autoRead === 'boolean') setPreferences({ large: saved.large, rate: saved.rate, autoRead: saved.autoRead });
    } catch { /* Private mode or unavailable storage uses defaults. */ }
    return () => { request.current?.abort(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, []);
  useEffect(() => { if (stage !== 'home') main.current?.focus(); }, [stage]);
  const fail = useCallback((message: string) => { setError(message); setStage('error'); }, []);
  const convert = useCallback(async (text: string) => {
    request.current?.abort(); stopReading(); setSpeechMessage('');
    const controller = new AbortController(); request.current = controller;
    setOriginal(text); setResult(null); setStage('processing');
    const timeout = setTimeout(() => controller.abort(), 55000);
    try {
      if (!navigator.onLine) { fail('인터넷 연결을 확인해 주세요.'); return; }
      const response = await fetch('/api/simplify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: controller.signal, cache: 'no-store' });
      const data = await response.json();
      if (request.current !== controller) return;
      if (!response.ok) { fail(typeof data.error === 'string' ? data.error : '쉬운 말로 바꾸지 못했어요. 다시 시도해 주세요.'); return; }
      const validated = validateResult(data); setResult(validated); setStage('result');
      if (prefs.current.autoRead) read(validated);
    } catch {
      if (request.current === controller) fail(navigator.onLine ? '쉬운 말로 바꾸지 못했어요. 다시 시도해 주세요.' : '인터넷 연결을 확인해 주세요.');
    } finally { clearTimeout(timeout); if (request.current === controller) request.current = null; }
  }, [fail, read, stopReading]);
  const speech = useSpeechInput(convert, fail);
  function reset() {
    const active = request.current; request.current = null; active?.abort();
    speech.cancel(); stopReading(); setOriginal(''); setResult(null); setError(''); setSpeechMessage(''); setTyped(false); setStage('home');
  }
  function beginListening() {
    stopReading(); setOriginal(''); setResult(null); setError(''); setTyped(false); setStage('home'); speech.start();
  }
  function updatePreferences(value: Preferences) {
    setPreferences(value); stopReading();
    try { localStorage.setItem('easy-words-preferences-v1', JSON.stringify(value)); } catch { /* Still works for this visit. */ }
  }
  return <div className={`app ${preferences.large ? 'extra-large' : ''}`}>
    <a href="#main" className="skip-link">본문으로 이동</a>
    <header className="header"><button className="brand" onClick={reset} aria-label="쉬운 말 처음으로"><span className="brand-mark"><AudioLines aria-hidden="true" size={25} /></span>쉬운 말</button><button className="quiet settings-trigger" onClick={() => { stopReading(); setSettingsOpen(true); }} disabled={speech.listening || stage === 'processing'}><Settings2 size={22} aria-hidden="true" /> 설정</button></header>
    <main id="main" ref={main} tabIndex={-1}>
      {config.notice && <p className="notice" role="status">{config.notice}</p>}
      {!config.enabled ? <section className="center-state"><TriangleAlert size={46} /><h1>잠시 쉬고 있어요</h1><p>조금 뒤에 다시 와 주세요.</p></section> : <>
        {stage === 'home' && !speech.listening && <section className="home">
          <div className="intro"><span className="eyebrow">한 번에 하나씩, 천천히</span><h1>어려운 말을<br /><em>쉽게</em> 바꿔드려요.</h1><p>마이크를 누르고<br className="mobile-break" /> 상대방의 말을 들려주세요.</p></div>
          <button className="mic-button" onClick={beginListening} disabled={speech.supported !== true} aria-label="말을 들려주세요. 마이크 켜기"><span className="mic-icon"><Mic size={62} strokeWidth={1.7} aria-hidden="true" /></span><span>말을 들려주세요</span></button>
          {speech.supported === false && <p className="support-message" role="status">이 기기에서는 음성 입력을 지원하지 않아요.<br />아래에서 글로 입력해 주세요.</p>}
          <p className="mic-hint">다 말하면 한 번 더 눌러주세요.</p>
          <div className="home-divider"><span>또는</span></div>
          <button className="text-entry-button" onClick={() => setTyped(!typed)} aria-expanded={typed}><Keyboard aria-hidden="true" size={24} /> 글로 입력하기 <ChevronDown size={20} aria-hidden="true" /></button>
          {(typed || speech.supported === false) && <form className="text-form" onSubmit={e => { e.preventDefault(); void convert(original.trim()); }}><label htmlFor="typed-input">들은 말을 적어주세요</label><textarea id="typed-input" value={original} onChange={e => setOriginal(e.target.value)} maxLength={2000} rows={4} placeholder="쉽게 바꾸고 싶은 말을 입력하세요." /><span className="muted count">{original.length} / 2,000자</span><button className="primary full" disabled={original.trim().length < 2}>쉬운 말로 바꾸기</button></form>}
          <div className="three-steps" aria-label="사용 순서"><span><b>1</b> 말 들려주기</span><span><b>2</b> 쉬운 말 보기</span><span><b>3</b> 소리로 듣기</span></div>
        </section>}
        {speech.listening && <section className="center-state listening"><span className="eyebrow">말을 듣는 중</span><h1>듣고 있어요</h1><p>상대방의 말을 들려주세요.</p><div className="wave" aria-hidden="true">{Array.from({ length: 11 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.1}s` }} />)}</div><div className="live-transcript">{speech.transcript || '말씀하시면 여기에 보여요.'}</div><button className="primary full" onClick={speech.stop}><Square size={22} fill="currentColor" aria-hidden="true" /> 듣기 끝내기</button><button className="quiet" onClick={reset}>취소하기</button><p className="muted">말이 끝나면 자동으로 멈춰요.</p></section>}
        {stage === 'processing' && <section className="center-state" role="status"><LoaderCircle className="spinner" size={52} aria-hidden="true" /><h1>쉬운 말로<br />바꾸고 있어요.</h1><p>조금만 기다려 주세요.</p><button className="quiet" onClick={reset}>취소하기</button></section>}
        {stage === 'error' && <section className="center-state"><TriangleAlert size={48} className="alert-icon" aria-hidden="true" /><h1>다시 해볼까요?</h1><p role="alert">{error}</p>{original && <button className="primary full" onClick={() => void convert(original)}>다시 바꾸기</button>}<button className={original ? 'secondary full' : 'primary full'} onClick={reset}><RotateCcw size={23} aria-hidden="true" /> 처음으로</button></section>}
        {stage === 'result' && result && <div className="results"><div className="result-top"><span className="eyebrow">{result.uncertain ? '한 번 더 확인해요' : '들은 말을 쉽게 바꿨어요'}</span><button className="quiet" onClick={reset}>처음으로</button></div><ResultCards result={result} />
          <button className="primary full listen-result" onClick={() => reading ? stopReading() : read(result)} disabled={!speechAvailable}>{reading ? <Square size={24} aria-hidden="true" /> : <Volume2 size={27} aria-hidden="true" />}{reading ? '읽기 멈추기' : result.uncertain ? '안내 듣기' : '쉬운 말 듣기'}</button>
          {(!speechAvailable || speechMessage) && <p role="status" className="muted">{speechMessage || '이 기기에서는 소리로 읽을 수 없어요.'}</p>}
          <details className="original"><summary>들은 말 보기</summary><p>{original}</p><button className="quiet" onClick={() => { stopReading(); setTyped(true); setStage('home'); }}>들은 말 고치기</button></details>
          <p className="result-note">날짜·돈·약에 관한 말은 상대방에게 한 번 더 확인해 주세요.</p>
          <button className="secondary full" onClick={speech.supported ? beginListening : reset}><RotateCcw size={24} aria-hidden="true" /> 다시 듣기</button>
        </div>}
      </>}
    </main>
    <footer><p><ShieldCheck size={20} aria-hidden="true" /> 대화는 이 앱에 저장하지 않아요.</p><details><summary>음성과 글은 어떻게 쓰이나요?</summary><p>음성 인식을 위해 브라우저의 음성 서비스로 소리가 전송될 수 있어요. 들은 글은 쉬운 말로 바꾸기 위해 AI 서비스로 보내요. 이 앱은 음성 파일이나 대화 기록을 저장하지 않아요. 각 서비스는 자체 정책에 따라 정보를 처리해요.</p></details></footer>
    <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} value={preferences} onChange={updatePreferences} />
  </div>;
}
