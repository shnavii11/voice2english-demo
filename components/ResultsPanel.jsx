'use client';
import { useState } from 'react';

export default function ResultsPanel({ result }) {
  const [copiedHindi, setCopiedHindi]     = useState(false);
  const [copiedEnglish, setCopiedEnglish] = useState(false);
  if (!result) return null;

  function copy(text, setCopied) {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const cards = [
    {
      label: '🇮🇳 हिंदी', sub: 'source transcript', text: result.transcript,
      accent: 'var(--primary)', copied: copiedHindi, setCopied: setCopiedHindi,
    },
    {
      label: '🇬🇧 English', sub: 'translated output', text: result.translation,
      accent: 'var(--accent)', copied: copiedEnglish, setCopied: setCopiedEnglish,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map(c => (
        <div key={c.label} className="rounded-xl p-5"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `3px solid ${c.accent}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: c.accent }}>{c.label}</span>
              <span className="text-[11px] italic font-light" style={{ color: 'var(--muted-fg)', fontFamily: 'Merriweather, serif' }}>{c.sub}</span>
            </div>
            <button onClick={() => copy(c.text, c.setCopied)}
              className="text-[10px] px-2 py-1 rounded transition-colors"
              style={{ color: c.copied ? c.accent : 'var(--muted-fg)', background: 'var(--muted)' }}>
              {c.copied ? '✓ copied' : 'copy'}
            </button>
          </div>
          <p className="font-mono text-[13.5px] leading-relaxed min-h-[60px]">{c.text}</p>
        </div>
      ))}
    </div>
  );
}
