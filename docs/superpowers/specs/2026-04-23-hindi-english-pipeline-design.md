# voice2english — Design Spec
**Date:** 2026-04-23

## Summary
Hindi → English translation pipeline as a Next.js 14 App Router web app, hosted on Vercel. Demo-ready for academic presentation.

## Stack
| Layer | Choice | Cost |
|---|---|---|
| STT | HuggingFace Inference API — `openai/whisper-large-v3` | Free |
| Translation | HuggingFace Inference API — `Helsinki-NLP/opus-mt-hi-en` | Free |
| Hosting | Vercel | Free |
| Blob storage | Vercel Blob (temp audio, auto-deleted) | Free |
| Persistence | localStorage (last result only) | — |

## API Keys Required
- `HF_TOKEN` — HuggingFace token (huggingface.co/settings/tokens)
- `BLOB_READ_WRITE_TOKEN` — auto-provisioned by Vercel Blob

## Architecture
- `POST /api/pipeline` — receives audio, uploads to Blob, calls HF Whisper, calls HF Helsinki-NLP, returns `{ transcript, translation, confidence, timing }`
- `POST /api/evaluate` — receives `{ hypothesis, reference }`, returns `{ bleu, wer }`
- All API keys in Vercel env vars

## Components
- `AudioRecorder.jsx` — MediaRecorder API, webm/opus output
- `FileUpload.jsx` — drag-drop, accepts mp3/wav/m4a/webm/ogg/flac
- `ResultsPanel.jsx` — Hindi transcript + English translation side-by-side
- `EvaluationPanel.jsx` — reference textarea + BLEU/WER scores
- `MetricsDisplay.jsx` — confidence + timing breakdown

## Lib
- `lib/huggingface.js` — HF Inference client with retry (max 3, exp backoff)
- `lib/metrics.js` — BLEU (corpus BLEU, sacrebleu-compatible) + WER (edit distance)
- `lib/storage.js` — Vercel Blob upload/delete helpers

## UI Theme
Sunset-horizon (tweakcn.com) — light mode. Montserrat + Merriweather + Ubuntu Mono.

## Testing
- Unit (Jest): metrics.js BLEU/WER correctness, HF client retry logic
- Integration (Jest): /api/pipeline and /api/evaluate with mocked HF responses
- E2E (Playwright): upload audio → see result, paste reference → see scores
