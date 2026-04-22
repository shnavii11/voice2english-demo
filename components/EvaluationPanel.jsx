'use client';
import { useState } from 'react';

export default function EvaluationPanel({ hypothesis }) {
  const [reference, setReference] = useState('');
  const [scores, setScores]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  async function evaluate() {
    if (!reference.trim() || !hypothesis?.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hypothesis, reference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScores(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const metrics = scores ? [
    { name: 'BLEU Score',      value: scores.bleu.toFixed(3), hint: 'higher is better · max 1.0', pct: scores.bleu * 100, color: 'var(--primary)', invert: false },
    { name: 'Word Error Rate', value: `${(scores.wer * 100).toFixed(1)}%`, hint: 'lower is better · min 0%', pct: Math.min(scores.wer * 100, 100), color: 'var(--accent)', invert: true },
  ] : [];

  return (
    <div className="rounded-2xl p-7 relative overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="absolute top-0 left-[10%] right-[10%] h-px"
        style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.5 }} />

      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: 'color-mix(in oklch, var(--accent) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--accent) 25%, transparent)' }}>📊</div>
        <div>
          <div className="font-bold text-[15px]">Metric Evaluation</div>
          <div className="text-[12px] italic mt-0.5" style={{ fontFamily: 'Merriweather, serif', color: 'var(--muted-fg)' }}>
            Paste a correct reference translation to score accuracy using BLEU + WER.
          </div>
        </div>
      </div>

      <textarea value={reference} onChange={e => setReference(e.target.value)} rows={3}
        placeholder="Paste your reference (correct) English translation here…"
        className="w-full font-mono text-[13px] rounded-lg px-4 py-3 outline-none resize-none transition-colors mb-4"
        style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--fg)' }}
      />

      <button onClick={evaluate}
        disabled={loading || !reference.trim() || !hypothesis?.trim()}
        className="font-semibold text-[13px] px-6 py-2.5 rounded-lg transition-all mb-5 disabled:opacity-40 hover:-translate-y-0.5 active:translate-y-0 text-white"
        style={{ background: 'var(--primary)' }}>
        {loading ? 'Evaluating…' : 'Run Evaluation'}
      </button>

      {error && <p className="text-sm mb-4 text-red-600">{error}</p>}

      {scores && (
        <div className="grid grid-cols-2 gap-4">
          {metrics.map(m => (
            <div key={m.name} className="rounded-xl p-5 text-center"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
              <div className="text-[9px] font-bold tracking-[2px] uppercase mb-2" style={{ color: 'var(--muted-fg)' }}>{m.name}</div>
              <div className="font-mono text-5xl font-bold leading-none mb-1" style={{ color: m.color }}>{m.value}</div>
              <div className="text-[10px] italic mb-3" style={{ fontFamily: 'Merriweather, serif', color: 'var(--muted-fg)' }}>{m.hint}</div>
              <div className="w-3/4 mx-auto h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${m.invert ? 100 - m.pct : m.pct}%`, background: m.color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
