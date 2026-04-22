'use client';
import { useState, useRef } from 'react';

const ACCEPTED_TYPES = new Set(['audio/mpeg','audio/mp3','audio/wav','audio/x-wav',
  'audio/m4a','audio/x-m4a','audio/mp4','audio/webm','audio/ogg','audio/flac','audio/x-flac']);
const MAX_MB = 10;

export default function FileUpload({ onResult, onError, disabled }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    const validType = ACCEPTED_TYPES.has(file.type) || /\.(mp3|wav|m4a|webm|ogg|flac)$/i.test(file.name);
    if (!validType) { onError?.('Unsupported file type. Use mp3, wav, m4a, webm, ogg, or flac.'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { onError?.(`File too large. Max ${MAX_MB}MB.`); return; }

    setLoading(true);
    onResult?.(null);
    const form = new FormData();
    form.append('audio', file, file.name);
    try {
      const res = await fetch('/api/pipeline', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? `Server error (${res.status})`);
      onResult?.(data);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => !disabled && !loading && inputRef.current?.click()}
      className="w-full rounded-xl flex flex-col items-center gap-2 py-6 px-4 text-center cursor-pointer transition-all"
      style={{
        border: `1px dashed ${dragging ? 'var(--primary)' : 'var(--border)'}`,
        background: dragging ? 'color-mix(in oklch, var(--primary) 4%, transparent)' : 'transparent',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <input ref={inputRef} type="file" accept=".mp3,.wav,.m4a,.webm,.ogg,.flac" className="hidden"
        onChange={e => handleFile(e.target.files?.[0])} />
      <span className="text-2xl" style={{ opacity: 0.7 }}>{loading ? '⏳' : '↑'}</span>
      <span className="text-sm" style={{ color: 'var(--muted-fg)' }}>
        {loading ? 'Processing…' : 'Drop audio file or click to browse'}
      </span>
      <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--muted-fg)', opacity: 0.55 }}>
        mp3 · wav · m4a · webm · ogg · flac · max {MAX_MB}MB
      </span>
    </div>
  );
}
