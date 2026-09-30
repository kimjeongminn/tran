'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export function useSpeechInput(onComplete: (text: string) => void, onError: (message: string) => void) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacks = useRef({ onComplete, onError });
  callbacks.current = { onComplete, onError };
  function clearTimers() {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
  }
  const cancel = useCallback(() => {
    clearTimers();
    if (recognition.current) {
      recognition.current.onend = null; recognition.current.onerror = null; recognition.current.onresult = null;
      recognition.current.abort(); recognition.current = null;
    }
    setListening(false); setTranscript('');
  }, []);
  useEffect(() => {
    const w = window as SpeechWindow;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => { clearTimers(); if (recognition.current) { recognition.current.onend = null; recognition.current.onerror = null; recognition.current.onresult = null; recognition.current.abort(); } };
  }, []);
  const start = useCallback(() => {
    if (recognition.current) return;
    const w = window as SpeechWindow;
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) { callbacks.current.onError('이 기기에서는 마이크를 사용할 수 없어요. 글로 입력해 주세요.'); return; }
    let finalText = ''; let failed = false;
    const current = new Constructor(); recognition.current = current;
    current.lang = 'ko-KR'; current.continuous = true; current.interimResults = true;
    setTranscript(''); setListening(true);
    current.onresult = event => {
      let all = ''; finalText = '';
      for (let i = 0; i < event.results.length; i++) {
        const segment = event.results[i][0].transcript;
        all += segment + ' ';
        if (event.results[i].isFinal) finalText += segment + ' ';
      }
      setTranscript(all.trim());
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => current.stop(), 5000);
      if (all.length >= 2000) current.stop();
    };
    current.onerror = event => {
      failed = true; clearTimers(); setListening(false);
      const messages: Record<string, string> = {
        'not-allowed': '마이크 사용을 허용해 주세요. 글로 입력해도 괜찮아요.',
        'service-not-allowed': '이 기기에서 음성을 듣지 못했어요. 글로 입력해 주세요.',
        'audio-capture': '마이크를 찾지 못했어요. 마이크 연결을 확인해 주세요.',
        'network': '인터넷 연결을 확인해 주세요.',
        'no-speech': '말을 찾지 못했어요. 조금 조용한 곳에서 다시 들려주세요.',
      };
      callbacks.current.onError(messages[event.error] || '말을 잘 듣지 못했어요. 다시 들려주세요.');
    };
    current.onend = () => {
      clearTimers(); setListening(false); recognition.current = null;
      if (failed) return;
      if (finalText.trim().length < 2) callbacks.current.onError('말을 잘 듣지 못했어요. 다시 들려주세요.');
      else if (finalText.trim().length > 2000) callbacks.current.onError('말이 너무 길어요. 짧게 나누어서 들려주세요.');
      else callbacks.current.onComplete(finalText.trim());
    };
    try {
      current.start();
      silenceTimer.current = setTimeout(() => current.stop(), 12000);
      maxTimer.current = setTimeout(() => current.stop(), 60000);
    } catch {
      recognition.current = null; setListening(false);
      callbacks.current.onError('마이크를 켜지 못했어요. 다시 시도해 주세요.');
    }
  }, []);
  return { supported, listening, transcript, start, stop: () => recognition.current?.stop(), cancel };
}
