'use client';
import { useState, useEffect } from 'react';
import AudioRecorder from '@/components/AudioRecorder';
import FileUpload from '@/components/FileUpload';
import ResultsPanel from '@/components/ResultsPanel';
import MetricsDisplay from '@/components/MetricsDisplay';
import EvaluationPanel from '@/components/EvaluationPanel';

const STORAGE_KEY = 'v2e_last_result';

export default function Home() {
  const [mode, setMode]           = useState('record');
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setResult(JSON.parse(saved));
    } catch {}
  }, []);

  function handleResult(data) {
    if (!data) { setProcessing(true); setError(''); return; }
    setProcessing(false);
    setError('');
    setResult(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }

  function handleError(msg) {
    setProcessing(false);
    setError(msg);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Warm radial backdrop */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 100% 45% at 50% -5%, color-mix(in oklch, var(--primary) 8%, transparent) 0%, transparent 60%)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-10 pb-20">

        {/* ── Header ── */}
        <header className="mb-10">
          <div className="flex items-end gap-3 mb-2">
            <h1 className="text-4xl font-bold tracking-tight leading-none"
              style={{ color: 'var(--primary)' }}>
              voice<span style={{ color: 'var(--accent)' }}>2</span>english
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide mb-0.5"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: 'var(--primary)' }} />
              Live Demo
            </span>
          </div>
          <p className="text-[13px] italic" style={{ fontFamily: 'Merriweather, serif', color: 'var(--muted-fg)' }}>
            A Hindi speech-to-English translation pipeline — powered by Hugging Face.
          </p>
        </header>

        {/* ── Mode tabs ── */}
        <div className="inline-flex gap-1 rounded-lg p-1 mb-6"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
          {[{ id: 'record', label: '🎙  Record' }, { id: 'upload', label: '📎  Upload File' }].map(t => (
            <button key={t.id} onClick={() => setMode(t.id)}
              className="px-5 py-2 rounded-md text-[13px] font-medium transition-all"
              style={{
                background: mode === t.id ? 'var(--card)' : 'transparent',
                color: mode === t.id ? 'var(--fg)' : 'var(--muted-fg)',
                border: mode === t.id ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: mode === t.id ? '0 1px 6px rgba(0,0,0,0.06)' : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Input card ── */}
        <div className="rounded-2xl p-9 mb-5 relative overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {/* Top shimmer line */}
          <div className="absolute top-0 left-[10%] right-[10%] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, var(--primary), var(--accent), transparent)', opacity: 0.55 }} />

          {mode === 'record' ? (
            <>
              <AudioRecorder onResult={handleResult} onError={handleError} disabled={processing} />
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-[11px] italic" style={{ fontFamily: 'Merriweather, serif', color: 'var(--muted-fg)', opacity: 0.7 }}>or drag a file below</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <FileUpload onResult={handleResult} onError={handleError} disabled={processing} />
            </>
          ) : (
            <FileUpload onResult={handleResult} onError={handleError} disabled={processing} />
          )}
        </div>

        {/* ── Processing badge ── */}
        {processing && (
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold tracking-wide uppercase"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
              <span className="w-3 h-3 rounded-full border-2 animate-spin inline-block"
                style={{ borderColor: 'color-mix(in oklch, var(--accent) 30%, transparent)', borderTopColor: 'var(--accent)' }} />
              Transcribing → Translating
            </span>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="rounded-lg px-4 py-3 mb-4 text-sm"
            style={{ background: 'oklch(0.95 0.02 22)', border: '1px solid oklch(0.85 0.08 22)', color: 'oklch(0.45 0.18 22)' }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <div className="flex flex-col gap-4">
            <ResultsPanel result={result} />
            <MetricsDisplay timing={result.timing} />
            <EvaluationPanel hypothesis={result.translation} />
          </div>
        )}

        <footer className="mt-12 text-center text-[11px] italic pt-5"
          style={{ fontFamily: 'Merriweather, serif', color: 'var(--muted-fg)', borderTop: '1px solid var(--border)' }}>
          Powered by Hugging Face · Whisper large-v3 · Helsinki-NLP/opus-mt-hi-en
        </footer>
      </div>
    </div>
  );
}
