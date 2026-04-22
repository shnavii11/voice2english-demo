'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

const WAVE_HEIGHTS = [5,12,20,8,24,6,16,22,8,18,5,28,14,7,20,10,24,5,16,22,8,18,5,28,10,22,5,14,20,8,24,6,18,26,5,12,20,8,16,22,6,24,5,14];

export default function AudioRecorder({ onResult, onError, disabled }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await submit(blob, 'recording.webm', 'audio/webm');
      };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      onError?.('Microphone access denied. Please allow microphone permissions.');
    }
  }, [onError]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    mediaRef.current?.stop();
    setRecording(false);
  }, []);

  async function submit(blob, filename, mimeType) {
    setLoading(true);
    onResult?.(null);
    const form = new FormData();
    form.append('audio', blob, filename);
    try {
      const res = await fetch('/api/pipeline', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Pipeline failed');
      onResult?.(data);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fmt = s => `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`;

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div className="relative flex items-center justify-center w-28 h-28">
        {recording && (
          <>
            <span className="absolute inset-0 rounded-full border"
              style={{ borderColor: 'var(--primary)', animation: 'ripple-ring 2s ease-out infinite' }} />
            <span className="absolute rounded-full border"
              style={{ inset: '-12px', borderColor: 'var(--primary)', animation: 'ripple-ring 2s ease-out 0.6s infinite' }} />
          </>
        )}
        <button
          onClick={recording ? stop : start}
          disabled={disabled || loading}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
          className="relative z-10 w-[72px] h-[72px] rounded-full flex items-center justify-center text-3xl transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
          style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 4px 20px color-mix(in oklch, var(--primary) 35%, transparent)' }}
        >
          {loading ? <span className="w-6 h-6 rounded-full border-2 animate-spin block" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
            : recording ? '⏹' : '🎙'}
        </button>
      </div>

      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-fg)' }}>
        {recording
          ? <span className="font-mono text-base" style={{ color: 'var(--primary)' }}>{fmt(seconds)}</span>
          : loading ? 'Processing…' : 'Tap to record in Hindi'}
      </p>

      <div className="flex items-center gap-[3px] h-10 w-full justify-center px-4">
        {WAVE_HEIGHTS.map((h, i) => (
          <span key={i} className="w-[3px] rounded-sm block"
            style={{
              height: `${h}px`,
              background: `linear-gradient(to top, var(--primary), var(--accent))`,
              opacity: recording ? 0.75 : 0.35,
              animation: `waveIdle ${1.4 + (i % 5) * 0.18}s ease-in-out infinite`,
              animationDelay: `${(i % 7) * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
