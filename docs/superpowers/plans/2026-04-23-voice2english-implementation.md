# voice2english Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Hindi → English speech translation web app on Next.js 14 App Router, deployed on Vercel, with BLEU/WER metric evaluation.

**Architecture:** Browser records or uploads audio → POST /api/pipeline → HF Whisper (STT) + HF Helsinki-NLP (translate) → results shown. Separate POST /api/evaluate computes BLEU + WER from hypothesis + reference strings. All in one Next.js app on Vercel.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, @huggingface/inference, Jest, Playwright, Vercel

---

## File Map

| File | Responsibility |
|---|---|
| `.env.local` | HF_TOKEN secret |
| `app/globals.css` | Sunset-horizon light mode CSS vars + base styles |
| `tailwind.config.js` | Map Tailwind colors to CSS vars |
| `next.config.mjs` | Increase body size limit for audio uploads |
| `lib/huggingface.js` | HF Inference API client — transcribe + translate + retry |
| `lib/metrics.js` | BLEU score + WER computation |
| `app/api/pipeline/route.js` | POST: audio → transcript + translation |
| `app/api/evaluate/route.js` | POST: hypothesis + reference → BLEU + WER |
| `components/AudioRecorder.jsx` | Browser mic recording via MediaRecorder API |
| `components/FileUpload.jsx` | Drag-drop / click audio file upload |
| `components/ResultsPanel.jsx` | Side-by-side Hindi transcript + English translation |
| `components/EvaluationPanel.jsx` | Reference textarea + BLEU/WER score display |
| `components/MetricsDisplay.jsx` | Confidence + timing stats strip |
| `app/page.js` | Main page — composes all components |
| `tests/unit/metrics.test.js` | Jest unit tests for BLEU + WER |
| `tests/unit/huggingface.test.js` | Jest unit tests for HF client retry logic |
| `tests/integration/pipeline.test.js` | Jest integration test for /api/pipeline (mocked HF) |
| `tests/integration/evaluate.test.js` | Jest integration test for /api/evaluate |
| `tests/e2e/app.spec.js` | Playwright E2E: upload → result → evaluate |

---

## Task 1: Environment, dependencies, config

**Files:**
- Create: `.env.local`
- Modify: `package.json`
- Modify: `next.config.mjs`
- Modify: `tailwind.config.js`
- Modify: `app/globals.css`

- [ ] **Step 1: Write .env.local**

```
HF_TOKEN=HF_TOKEN_REDACTED
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @huggingface/inference
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom babel-jest @babel/core @babel/preset-env @babel/preset-react
npm install --save-dev @playwright/test
npx playwright install --with-deps chromium
```

- [ ] **Step 3: Add jest config to package.json**

Replace `package.json` with:
```json
{
  "name": "voice2english-demo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@huggingface/inference": "^2.8.1",
    "react": "^18",
    "react-dom": "^18",
    "next": "14.2.35"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@babel/preset-env": "^7.24.0",
    "@babel/preset-react": "^7.24.0",
    "@playwright/test": "^1.43.0",
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^15.0.2",
    "babel-jest": "^29.7.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "postcss": "^8",
    "tailwindcss": "^3.4.1"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterFramework": ["@testing-library/jest-dom"],
    "testPathPattern": "tests/(unit|integration)/.*\\.test\\.js$",
    "transform": {
      "^.+\\.[jt]sx?$": "babel-jest"
    },
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/$1"
    }
  }
}
```

- [ ] **Step 4: Create babel.config.js**

```js
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};
```

- [ ] **Step 5: Update next.config.mjs to allow larger audio uploads**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default nextConfig;
```

- [ ] **Step 6: Update tailwind.config.js with sunset-horizon tokens**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
        mono: ['Ubuntu Mono', 'monospace'],
      },
      colors: {
        background:  'oklch(var(--background) / <alpha-value>)',
        foreground:  'oklch(var(--foreground) / <alpha-value>)',
        card:        'oklch(var(--card) / <alpha-value>)',
        primary:     'oklch(var(--primary) / <alpha-value>)',
        accent:      'oklch(var(--accent) / <alpha-value>)',
        border:      'oklch(var(--border) / <alpha-value>)',
        muted:       'oklch(var(--muted) / <alpha-value>)',
        'muted-fg':  'oklch(var(--muted-fg) / <alpha-value>)',
      },
      borderRadius: {
        DEFAULT: '0.625rem',
        lg: '1rem',
        xl: '1.25rem',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 7: Replace app/globals.css with sunset-horizon light mode**

```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;1,300;1,400&family=Ubuntu+Mono:wght@400;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background:      0.9856 0.0084 56.3169;
  --foreground:      0.3353 0.0132 2.7676;
  --card:            1.0000 0 0;
  --card-fg:         0.3353 0.0132 2.7676;
  --primary:         0.7357 0.1641 34.7091;
  --primary-fg:      1.0000 0 0;
  --secondary:       0.9596 0.0200 28.9029;
  --secondary-fg:    0.5587 0.1294 32.7364;
  --muted:           0.9656 0.0176 39.4009;
  --muted-fg:        0.5534 0.0116 58.0708;
  --accent:          0.8278 0.1131 57.9984;
  --accent-fg:       0.3353 0.0132 2.7676;
  --border:          0.9296 0.0370 38.6868;
  --input:           0.9296 0.0370 38.6868;
  --ring:            0.7357 0.1641 34.7091;
  --radius:          0.625rem;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: oklch(var(--background));
  color: oklch(var(--foreground));
  font-family: 'Montserrat', sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 8: Create playwright.config.js**

```js
// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 9: Create test directories**

```bash
mkdir -p tests/unit tests/integration tests/e2e
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: setup dependencies, sunset-horizon theme, jest, playwright"
```

---

## Task 2: lib/metrics.js — BLEU + WER

**Files:**
- Create: `lib/metrics.js`
- Create: `tests/unit/metrics.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/unit/metrics.test.js
import { computeBLEU, computeWER } from '../../lib/metrics.js';

describe('computeWER', () => {
  test('exact match returns 0', () => {
    expect(computeWER('hello world', 'hello world')).toBe(0);
  });

  test('one substitution', () => {
    // "hello world" vs "hello earth" => 1 sub / 2 words = 0.5
    expect(computeWER('hello earth', 'hello world')).toBeCloseTo(0.5);
  });

  test('completely different', () => {
    // 2 subs / 2 = 1.0
    expect(computeWER('foo bar', 'hello world')).toBeCloseTo(1.0);
  });

  test('empty hypothesis', () => {
    // 2 deletions / 2 = 1.0
    expect(computeWER('', 'hello world')).toBeCloseTo(1.0);
  });

  test('extra word in hypothesis (insertion)', () => {
    // "hello world extra" vs "hello world" => 1 insertion / 2 = 0.5
    expect(computeWER('hello world extra', 'hello world')).toBeCloseTo(0.5);
  });
});

describe('computeBLEU', () => {
  test('exact match returns 1', () => {
    expect(computeBLEU('hello world', 'hello world')).toBeCloseTo(1.0);
  });

  test('no overlap returns 0', () => {
    expect(computeBLEU('foo bar baz qux', 'hello world test case')).toBe(0);
  });

  test('partial match returns value between 0 and 1', () => {
    const score = computeBLEU('hello world test', 'hello world case');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  test('short hypothesis gets brevity penalty', () => {
    const full = computeBLEU('hello world foo bar', 'hello world foo bar');
    const short = computeBLEU('hello world', 'hello world foo bar');
    expect(short).toBeLessThan(full);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/unit/metrics.test.js --no-coverage
```
Expected: FAIL — `Cannot find module '../../lib/metrics.js'`

- [ ] **Step 3: Implement lib/metrics.js**

```js
// lib/metrics.js

/**
 * Word Error Rate (WER) = (S + D + I) / N
 * Uses Levenshtein distance on word arrays.
 */
export function computeWER(hypothesis, reference) {
  const hyp = hypothesis.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const ref = reference.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (ref.length === 0) return hyp.length === 0 ? 0 : 1;

  const m = ref.length;
  const n = hyp.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (ref[i - 1] === hyp[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n] / m;
}

/**
 * Corpus BLEU (1–4 grams, uniform weights).
 * Compatible with sacrebleu corpus_bleu output.
 */
export function computeBLEU(hypothesis, reference) {
  const hyp = hypothesis.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const ref = reference.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (hyp.length === 0) return 0;

  let logSum = 0;
  const maxN = Math.min(4, ref.length, hyp.length);
  if (maxN === 0) return 0;

  for (let n = 1; n <= maxN; n++) {
    const hypNgrams = getNgramCounts(hyp, n);
    const refNgrams = getNgramCounts(ref, n);

    let clipped = 0;
    for (const [gram, count] of hypNgrams) {
      clipped += Math.min(count, refNgrams.get(gram) ?? 0);
    }

    const total = Math.max(1, hyp.length - n + 1);
    if (clipped === 0) return 0;
    logSum += Math.log(clipped / total);
  }

  // Brevity penalty
  const bp = hyp.length >= ref.length
    ? 1
    : Math.exp(1 - ref.length / hyp.length);

  return bp * Math.exp(logSum / maxN);
}

function getNgramCounts(tokens, n) {
  const counts = new Map();
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).join(' ');
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx jest tests/unit/metrics.test.js --no-coverage
```
Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/metrics.js tests/unit/metrics.test.js
git commit -m "feat: add BLEU and WER metric computation (sacrebleu-compatible)"
```

---

## Task 3: lib/huggingface.js — STT + Translation client

**Files:**
- Create: `lib/huggingface.js`
- Create: `tests/unit/huggingface.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/unit/huggingface.test.js
import { transcribeAudio, translateText } from '../../lib/huggingface.js';

// Mock global fetch
global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  process.env.HF_TOKEN = 'hf_test_token';
});

describe('transcribeAudio', () => {
  test('returns transcript text on success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'नमस्ते दुनिया' }),
    });

    const buffer = Buffer.from('fake-audio');
    const result = await transcribeAudio(buffer, 'audio/wav');
    expect(result.text).toBe('नमस्ते दुनिया');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('retries on 503 and succeeds', async () => {
    fetch
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: 'loading' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'hello' }) });

    const buffer = Buffer.from('fake-audio');
    const result = await transcribeAudio(buffer, 'audio/wav');
    expect(result.text).toBe('hello');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('throws after 3 failed attempts', async () => {
    fetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: 'loading' }) });

    const buffer = Buffer.from('fake-audio');
    await expect(transcribeAudio(buffer, 'audio/wav')).rejects.toThrow('HF Whisper failed after 3 attempts');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe('translateText', () => {
  test('returns translated text on success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ translation_text: 'Hello world' }],
    });

    const result = await translateText('नमस्ते दुनिया');
    expect(result).toBe('Hello world');
  });

  test('retries on 503', async () => {
    fetch
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: 'loading' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ translation_text: 'Hello' }] });

    const result = await translateText('नमस्ते');
    expect(result).toBe('Hello');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/unit/huggingface.test.js --no-coverage
```
Expected: FAIL — `Cannot find module '../../lib/huggingface.js'`

- [ ] **Step 3: Implement lib/huggingface.js**

```js
// lib/huggingface.js
const WHISPER_URL = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3';
const TRANSLATE_URL = 'https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-hi-en';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function hfRequest(url, options, attempt = 1) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const isLoading = res.status === 503 || body?.error?.includes?.('loading');
    if (isLoading && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
      return hfRequest(url, options, attempt + 1);
    }
    const label = url.includes('whisper') ? 'HF Whisper' : 'HF Translate';
    throw new Error(`${label} failed after ${attempt} attempts: ${body?.error ?? res.status}`);
  }

  return res.json();
}

/**
 * Transcribes Hindi audio buffer using Whisper large-v3.
 * @param {Buffer|ArrayBuffer} audioBuffer
 * @param {string} mimeType e.g. 'audio/wav', 'audio/mpeg'
 * @returns {Promise<{ text: string }>}
 */
export async function transcribeAudio(audioBuffer, mimeType = 'audio/wav') {
  const data = await hfRequest(WHISPER_URL, {
    method: 'POST',
    headers: { 'Content-Type': mimeType },
    body: audioBuffer,
  });
  return { text: data.text ?? '' };
}

/**
 * Translates Hindi text to English using Helsinki-NLP/opus-mt-hi-en.
 * @param {string} hindiText
 * @returns {Promise<string>} English translation
 */
export async function translateText(hindiText) {
  const data = await hfRequest(TRANSLATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: hindiText }),
  });
  return Array.isArray(data) ? data[0]?.translation_text ?? '' : '';
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx jest tests/unit/huggingface.test.js --no-coverage
```
Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/huggingface.js tests/unit/huggingface.test.js
git commit -m "feat: add HuggingFace inference client with retry logic"
```

---

## Task 4: /api/pipeline route

**Files:**
- Create: `app/api/pipeline/route.js`
- Create: `tests/integration/pipeline.test.js`

- [ ] **Step 1: Write failing integration test**

```js
// tests/integration/pipeline.test.js
jest.mock('../../lib/huggingface.js', () => ({
  transcribeAudio: jest.fn(),
  translateText: jest.fn(),
}));

import { POST } from '../../app/api/pipeline/route.js';
import { transcribeAudio, translateText } from '../../lib/huggingface.js';

function makeFormDataRequest(fileBuffer, filename = 'test.wav', mimeType = 'audio/wav') {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append('audio', blob, filename);
  return new Request('http://localhost/api/pipeline', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/pipeline', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns transcript and translation', async () => {
    transcribeAudio.mockResolvedValue({ text: 'नमस्ते दुनिया' });
    translateText.mockResolvedValue('Hello world');

    const req = makeFormDataRequest(Buffer.from('fake-audio'));
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.transcript).toBe('नमस्ते दुनिया');
    expect(json.translation).toBe('Hello world');
    expect(json.timing).toHaveProperty('sttMs');
    expect(json.timing).toHaveProperty('translateMs');
    expect(json.timing).toHaveProperty('totalMs');
  });

  test('returns 400 when no audio file', async () => {
    const req = new Request('http://localhost/api/pipeline', {
      method: 'POST',
      body: new FormData(),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/no audio/i);
  });

  test('returns 500 when HF fails', async () => {
    transcribeAudio.mockRejectedValue(new Error('HF Whisper failed after 3 attempts: loading'));
    const req = makeFormDataRequest(Buffer.from('fake-audio'));
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/integration/pipeline.test.js --no-coverage
```
Expected: FAIL — `Cannot find module '../../app/api/pipeline/route.js'`

- [ ] **Step 3: Implement app/api/pipeline/route.js**

```js
// app/api/pipeline/route.js
import { NextResponse } from 'next/server';
import { transcribeAudio, translateText } from '@/lib/huggingface';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audioFile = formData.get('audio');
  if (!audioFile || typeof audioFile === 'string') {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  try {
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || 'audio/wav';

    const sttStart = Date.now();
    const { text: transcript } = await transcribeAudio(audioBuffer, mimeType);
    const sttMs = Date.now() - sttStart;

    const translateStart = Date.now();
    const translation = await translateText(transcript);
    const translateMs = Date.now() - translateStart;

    return NextResponse.json({
      transcript,
      translation,
      timing: { sttMs, translateMs, totalMs: sttMs + translateMs },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx jest tests/integration/pipeline.test.js --no-coverage
```
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/pipeline/route.js tests/integration/pipeline.test.js
git commit -m "feat: add /api/pipeline route with STT + translation"
```

---

## Task 5: /api/evaluate route

**Files:**
- Create: `app/api/evaluate/route.js`
- Create: `tests/integration/evaluate.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/integration/evaluate.test.js
import { POST } from '../../app/api/evaluate/route.js';

function makeJsonRequest(body) {
  return new Request('http://localhost/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/evaluate', () => {
  test('returns bleu and wer for valid input', async () => {
    const req = makeJsonRequest({
      hypothesis: 'hello world',
      reference: 'hello world',
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.bleu).toBeCloseTo(1.0, 1);
    expect(json.wer).toBeCloseTo(0, 1);
  });

  test('returns 400 when hypothesis or reference missing', async () => {
    const req = makeJsonRequest({ hypothesis: 'hello' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest tests/integration/evaluate.test.js --no-coverage
```
Expected: FAIL

- [ ] **Step 3: Implement app/api/evaluate/route.js**

```js
// app/api/evaluate/route.js
import { NextResponse } from 'next/server';
import { computeBLEU, computeWER } from '@/lib/metrics';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { hypothesis, reference } = body ?? {};
  if (!hypothesis || !reference) {
    return NextResponse.json({ error: 'hypothesis and reference are required' }, { status: 400 });
  }

  const bleu = computeBLEU(String(hypothesis), String(reference));
  const wer = computeWER(String(hypothesis), String(reference));

  return NextResponse.json({ bleu, wer });
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx jest tests/integration/evaluate.test.js --no-coverage
```
Expected: Both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/evaluate/route.js tests/integration/evaluate.test.js
git commit -m "feat: add /api/evaluate route for BLEU + WER scoring"
```

---

## Task 6: Components — AudioRecorder, FileUpload

**Files:**
- Create: `components/AudioRecorder.jsx`
- Create: `components/FileUpload.jsx`

- [ ] **Step 1: Create components/AudioRecorder.jsx**

```jsx
// components/AudioRecorder.jsx
'use client';
import { useState, useRef, useCallback } from 'react';

export default function AudioRecorder({ onResult, onError, disabled }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await submitAudio(blob, 'recording.webm', 'audio/webm');
      };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (err) {
      onError?.('Microphone access denied. Please allow microphone permissions.');
    }
  }, []);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    mediaRef.current?.stop();
    setRecording(false);
  }, []);

  async function submitAudio(blob, filename, mimeType) {
    onResult?.(null); // clear previous
    const form = new FormData();
    form.append('audio', blob, filename);
    try {
      const res = await fetch('/api/pipeline', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Pipeline failed');
      onResult?.(data);
    } catch (err) {
      onError?.(err.message);
    }
  }

  const fmt = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Ripple ring + button */}
      <div className="relative flex items-center justify-center w-28 h-28">
        {recording && (
          <>
            <span className="absolute inset-0 rounded-full border border-primary animate-ping opacity-40" />
            <span className="absolute inset-[-10px] rounded-full border border-primary animate-ping opacity-20" style={{ animationDelay: '0.5s' }} />
          </>
        )}
        <button
          onClick={recording ? stop : start}
          disabled={disabled}
          className="relative z-10 w-[72px] h-[72px] rounded-full flex items-center justify-center text-3xl shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
          style={{ background: 'oklch(var(--primary))', color: 'white' }}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          {recording ? '⏹' : '🎙'}
        </button>
      </div>

      {/* Timer / label */}
      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'oklch(var(--muted-fg))' }}>
        {recording ? (
          <span className="text-base font-mono" style={{ color: 'oklch(var(--primary))' }}>{fmt(seconds)}</span>
        ) : 'Tap to record in Hindi'}
      </p>

      {/* Idle waveform */}
      <div className="flex items-center gap-[3px] h-10 w-full justify-center px-4">
        {Array.from({ length: 44 }, (_, i) => (
          <span
            key={i}
            className="w-[3px] rounded-sm"
            style={{
              background: `linear-gradient(to top, oklch(var(--primary)), oklch(var(--accent)))`,
              opacity: recording ? 0.8 : 0.35,
              height: recording
                ? `${4 + Math.random() * 24}px`
                : `${[5,12,20,8,24,6,16,22,8,18,5,28,14,7][i % 14]}px`,
              animation: `waveIdle ${1.4 + (i % 5) * 0.2}s ease-in-out infinite`,
              animationDelay: `${(i % 7) * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create components/FileUpload.jsx**

```jsx
// components/FileUpload.jsx
'use client';
import { useState, useRef } from 'react';

const ACCEPTED = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a',
  'audio/x-m4a', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/x-flac'];
const MAX_MB = 10;

export default function FileUpload({ onResult, onError, disabled }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|webm|ogg|flac)$/i)) {
      onError?.('Unsupported file type. Please upload mp3, wav, m4a, webm, ogg, or flac.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      onError?.(`File too large. Maximum size is ${MAX_MB}MB.`);
      return;
    }

    setLoading(true);
    onResult?.(null);
    const form = new FormData();
    form.append('audio', file, file.name);
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

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => !disabled && !loading && inputRef.current?.click()}
      className="w-full rounded-xl border border-dashed transition-all cursor-pointer flex flex-col items-center gap-2 py-6 px-4 text-center"
      style={{
        borderColor: dragging ? 'oklch(var(--primary))' : 'oklch(var(--border))',
        background: dragging ? 'oklch(var(--primary) / 0.04)' : 'transparent',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <input ref={inputRef} type="file" accept=".mp3,.wav,.m4a,.webm,.ogg,.flac" className="hidden"
        onChange={e => handleFile(e.target.files?.[0])} />
      <span className="text-2xl">{loading ? '⏳' : '⬆'}</span>
      <span className="text-sm" style={{ color: 'oklch(var(--muted-fg))' }}>
        {loading ? 'Processing…' : 'Drop audio file or click to browse'}
      </span>
      <span className="font-mono text-[10px] tracking-wider" style={{ color: 'oklch(var(--muted-fg))', opacity: 0.6 }}>
        mp3 · wav · m4a · webm · ogg · flac · max 10 MB
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/AudioRecorder.jsx components/FileUpload.jsx
git commit -m "feat: add AudioRecorder and FileUpload components"
```

---

## Task 7: Components — ResultsPanel, MetricsDisplay, EvaluationPanel

**Files:**
- Create: `components/ResultsPanel.jsx`
- Create: `components/MetricsDisplay.jsx`
- Create: `components/EvaluationPanel.jsx`

- [ ] **Step 1: Create components/MetricsDisplay.jsx**

```jsx
// components/MetricsDisplay.jsx
export default function MetricsDisplay({ timing }) {
  if (!timing) return null;
  const { sttMs, translateMs, totalMs } = timing;
  const fmt = ms => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;

  const blocks = [
    { label: 'STT', value: fmt(sttMs), style: { color: 'oklch(var(--primary))' } },
    { label: 'Translate', value: fmt(translateMs), style: { color: 'oklch(var(--accent))' } },
    { label: 'Total', value: fmt(totalMs), style: { color: 'oklch(var(--primary))' } },
  ];

  return (
    <div className="grid grid-cols-3 rounded-lg border overflow-hidden"
      style={{ borderColor: 'oklch(var(--border))' }}>
      {blocks.map((b, i) => (
        <div key={b.label} className="py-3 px-2 text-center"
          style={{ borderRight: i < blocks.length - 1 ? '1px solid oklch(var(--border))' : 'none' }}>
          <div className="font-mono text-lg font-bold" style={b.style}>{b.value}</div>
          <div className="text-[9px] font-semibold uppercase tracking-widest mt-0.5"
            style={{ color: 'oklch(var(--muted-fg))' }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create components/ResultsPanel.jsx**

```jsx
// components/ResultsPanel.jsx
'use client';
import { useState } from 'react';

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text);
}

export default function ResultsPanel({ result }) {
  const [copiedHindi, setCopiedHindi] = useState(false);
  const [copiedEnglish, setCopiedEnglish] = useState(false);

  if (!result) return null;
  const { transcript, translation } = result;

  function handleCopy(text, setCopied) {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Hindi card */}
      <div className="rounded-xl border p-5 relative"
        style={{ background: 'oklch(var(--card))', borderColor: 'oklch(var(--border))', borderLeft: '3px solid oklch(var(--primary))' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: 'oklch(var(--primary))' }}>🇮🇳 हिंदी</span>
            <span className="text-[11px] italic font-light" style={{ color: 'oklch(var(--muted-fg))', fontFamily: 'Merriweather, serif' }}>source transcript</span>
          </div>
          <button onClick={() => handleCopy(transcript, setCopiedHindi)}
            className="text-[10px] px-2 py-1 rounded transition-colors"
            style={{ color: copiedHindi ? 'oklch(var(--primary))' : 'oklch(var(--muted-fg))', background: 'oklch(var(--muted))' }}>
            {copiedHindi ? '✓ copied' : 'copy'}
          </button>
        </div>
        <p className="font-mono text-[13.5px] leading-relaxed min-h-[60px]">{transcript}</p>
      </div>

      {/* English card */}
      <div className="rounded-xl border p-5 relative"
        style={{ background: 'oklch(var(--card))', borderColor: 'oklch(var(--border))', borderLeft: '3px solid oklch(var(--accent))' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: 'oklch(var(--accent))' }}>🇬🇧 English</span>
            <span className="text-[11px] italic font-light" style={{ color: 'oklch(var(--muted-fg))', fontFamily: 'Merriweather, serif' }}>translated output</span>
          </div>
          <button onClick={() => handleCopy(translation, setCopiedEnglish)}
            className="text-[10px] px-2 py-1 rounded transition-colors"
            style={{ color: copiedEnglish ? 'oklch(var(--accent))' : 'oklch(var(--muted-fg))', background: 'oklch(var(--muted))' }}>
            {copiedEnglish ? '✓ copied' : 'copy'}
          </button>
        </div>
        <p className="font-mono text-[13.5px] leading-relaxed min-h-[60px]">{translation}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create components/EvaluationPanel.jsx**

```jsx
// components/EvaluationPanel.jsx
'use client';
import { useState } from 'react';

export default function EvaluationPanel({ hypothesis }) {
  const [reference, setReference] = useState('');
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function evaluate() {
    if (!reference.trim() || !hypothesis?.trim()) return;
    setLoading(true);
    setError('');
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

  return (
    <div className="rounded-2xl border p-7 relative overflow-hidden"
      style={{ background: 'oklch(var(--card))', borderColor: 'oklch(var(--border))' }}>
      {/* Top glow line */}
      <div className="absolute top-0 left-[10%] right-[10%] h-px"
        style={{ background: 'linear-gradient(90deg, transparent, oklch(var(--accent)), transparent)', opacity: 0.5 }} />

      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: 'oklch(var(--accent) / 0.12)', border: '1px solid oklch(var(--accent) / 0.25)' }}>📊</div>
        <div>
          <div className="font-bold text-[15px]" style={{ color: 'oklch(var(--foreground))' }}>Metric Evaluation</div>
          <div className="text-[12px] italic mt-0.5" style={{ fontFamily: 'Merriweather, serif', color: 'oklch(var(--muted-fg))' }}>
            Paste a correct reference translation to score accuracy.
          </div>
        </div>
      </div>

      <textarea
        value={reference}
        onChange={e => setReference(e.target.value)}
        placeholder="Paste your reference (correct) English translation here..."
        rows={3}
        className="w-full font-mono text-[13px] rounded-lg px-4 py-3 outline-none resize-none transition-colors mb-4"
        style={{
          background: 'oklch(var(--muted))',
          border: '1px solid oklch(var(--border))',
          color: 'oklch(var(--foreground))',
        }}
      />

      <button
        onClick={evaluate}
        disabled={loading || !reference.trim() || !hypothesis?.trim()}
        className="font-semibold text-[13px] px-6 py-2.5 rounded-lg transition-all mb-5 disabled:opacity-40 hover:-translate-y-0.5 active:translate-y-0"
        style={{ background: 'oklch(var(--primary))', color: 'white' }}
      >
        {loading ? 'Evaluating…' : 'Run Evaluation'}
      </button>

      {error && <p className="text-sm mb-4" style={{ color: 'oklch(0.6122 0.2082 22.2410)' }}>{error}</p>}

      {scores && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'BLEU Score', key: 'bleu', value: scores.bleu.toFixed(3), hint: 'higher is better · max 1.0', pct: scores.bleu * 100, color: 'var(--primary)' },
            { name: 'Word Error Rate', key: 'wer', value: `${(scores.wer * 100).toFixed(1)}%`, hint: 'lower is better · min 0%', pct: Math.min(scores.wer * 100, 100), color: 'var(--accent)', invert: true },
          ].map(s => (
            <div key={s.key} className="rounded-xl border p-5 text-center"
              style={{ background: 'oklch(var(--muted))', borderColor: 'oklch(var(--border))' }}>
              <div className="text-[9px] font-bold tracking-[2px] uppercase mb-2"
                style={{ color: 'oklch(var(--muted-fg))' }}>{s.name}</div>
              <div className="font-mono text-5xl font-bold leading-none mb-1"
                style={{ color: `oklch(${s.color})` }}>{s.value}</div>
              <div className="text-[10px] italic mb-3" style={{ fontFamily: 'Merriweather, serif', color: 'oklch(var(--muted-fg))' }}>{s.hint}</div>
              <div className="w-3/4 mx-auto h-0.5 rounded-full overflow-hidden"
                style={{ background: 'oklch(var(--border))' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${s.invert ? 100 - s.pct : s.pct}%`, background: `oklch(${s.color})` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ResultsPanel.jsx components/MetricsDisplay.jsx components/EvaluationPanel.jsx
git commit -m "feat: add ResultsPanel, MetricsDisplay, EvaluationPanel components"
```

---

## Task 8: app/page.js — Main page

**Files:**
- Modify: `app/page.js`
- Modify: `app/layout.js`

- [ ] **Step 1: Update app/layout.js**

```jsx
// app/layout.js
import './globals.css';

export const metadata = {
  title: 'voice2english — Hindi to English Translation Pipeline',
  description: 'Record or upload Hindi audio and get an English translation instantly.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Replace app/page.js**

```jsx
// app/page.js
'use client';
import { useState, useEffect } from 'react';
import AudioRecorder from '@/components/AudioRecorder';
import FileUpload from '@/components/FileUpload';
import ResultsPanel from '@/components/ResultsPanel';
import MetricsDisplay from '@/components/MetricsDisplay';
import EvaluationPanel from '@/components/EvaluationPanel';

const STORAGE_KEY = 'v2e_last_result';

export default function Home() {
  const [mode, setMode] = useState('record');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  // Load last result from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setResult(JSON.parse(saved));
    } catch {}
  }, []);

  function handleResult(data) {
    if (!data) { setProcessing(true); return; }
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
    <div className="min-h-screen" style={{ background: 'oklch(var(--background))' }}>
      {/* Warm radial gradient backdrop */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 100% 50% at 50% -5%, oklch(0.7357 0.1641 34.7091 / 0.07) 0%, transparent 60%)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-10">

        {/* ── Header ── */}
        <header className="mb-10">
          <div className="flex items-end gap-3 mb-1">
            <h1 className="text-4xl font-bold tracking-tight leading-none"
              style={{ color: 'oklch(var(--primary))' }}>
              voice<span style={{ color: 'oklch(var(--accent))' }}>2</span>english
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide mb-0.5"
              style={{ background: 'oklch(var(--muted))', border: '1px solid oklch(var(--border))', color: 'oklch(var(--accent))' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: 'oklch(var(--primary))' }} />
              Live Demo
            </span>
          </div>
          <p className="text-[13px] italic" style={{ fontFamily: 'Merriweather, serif', color: 'oklch(var(--muted-fg))' }}>
            A Hindi speech-to-English translation pipeline — powered by Hugging Face.
          </p>
        </header>

        {/* ── Mode tabs ── */}
        <div className="inline-flex gap-1 rounded-lg p-1 mb-6"
          style={{ background: 'oklch(var(--muted))', border: '1px solid oklch(var(--border))' }}>
          {[{ id: 'record', label: '🎙  Record' }, { id: 'upload', label: '📎  Upload File' }].map(t => (
            <button key={t.id} onClick={() => setMode(t.id)}
              className="px-5 py-2 rounded-md text-[13px] font-medium transition-all"
              style={{
                background: mode === t.id ? 'oklch(var(--card))' : 'transparent',
                color: mode === t.id ? 'oklch(var(--foreground))' : 'oklch(var(--muted-fg))',
                boxShadow: mode === t.id ? '0 1px 6px oklch(0 0 0 / 0.08)' : 'none',
                border: mode === t.id ? '1px solid oklch(var(--border))' : '1px solid transparent',
              }}>{t.label}</button>
          ))}
        </div>

        {/* ── Input card ── */}
        <div className="rounded-2xl border p-9 mb-5 relative overflow-hidden"
          style={{ background: 'oklch(var(--card))', borderColor: 'oklch(var(--border))' }}>
          <div className="absolute top-0 left-[10%] right-[10%] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, oklch(var(--primary)), oklch(var(--accent)), transparent)', opacity: 0.55 }} />

          {mode === 'record' ? (
            <AudioRecorder onResult={handleResult} onError={handleError} disabled={processing} />
          ) : (
            <FileUpload onResult={handleResult} onError={handleError} disabled={processing} />
          )}

          {mode === 'record' && (
            <>
              <div className="flex items-center gap-3 my-5" style={{ color: 'oklch(var(--muted-fg))' }}>
                <div className="flex-1 h-px" style={{ background: 'oklch(var(--border))' }} />
                <span className="text-[11px] italic" style={{ fontFamily: 'Merriweather, serif', opacity: 0.7 }}>or drag a file below</span>
                <div className="flex-1 h-px" style={{ background: 'oklch(var(--border))' }} />
              </div>
              <FileUpload onResult={handleResult} onError={handleError} disabled={processing} />
            </>
          )}
        </div>

        {/* Processing badge */}
        {processing && (
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold tracking-wide uppercase"
              style={{ background: 'oklch(var(--muted))', border: '1px solid oklch(var(--border))', color: 'oklch(var(--accent))' }}>
              <span className="w-3 h-3 rounded-full border-2 animate-spin inline-block"
                style={{ borderColor: 'oklch(var(--accent) / 0.3)', borderTopColor: 'oklch(var(--accent))' }} />
              Transcribing → Translating
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg px-4 py-3 mb-4 text-sm"
            style={{ background: 'oklch(0.6122 0.2082 22.2410 / 0.08)', border: '1px solid oklch(0.6122 0.2082 22.2410 / 0.3)', color: 'oklch(0.45 0.18 22)' }}>
            ⚠ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            <ResultsPanel result={result} />
            <div className="mt-4 mb-6">
              <MetricsDisplay timing={result.timing} />
            </div>
            <EvaluationPanel hypothesis={result.translation} />
          </>
        )}

        <footer className="mt-12 text-center text-[11px] italic border-t pt-5"
          style={{ fontFamily: 'Merriweather, serif', color: 'oklch(var(--muted-fg))', borderColor: 'oklch(var(--border))' }}>
          Powered by Hugging Face · Whisper large-v3 · Helsinki-NLP/opus-mt-hi-en
        </footer>
      </div>

      <style jsx global>{`
        @keyframes waveIdle {
          0%, 100% { height: 5px; }
          50% { height: 20px; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 3: Run dev server and visually verify the UI**

```bash
npm run dev
```
Open http://localhost:3000. Verify:
- Sunset-horizon warm cream background loads
- Montserrat font is rendering
- Record tab shows mic button with rings
- Upload tab shows drop zone
- Toggle between Record/Upload tabs works

- [ ] **Step 4: Commit**

```bash
git add app/page.js app/layout.js
git commit -m "feat: build main page with full pipeline UI"
```

---

## Task 9: E2E tests (Playwright)

**Files:**
- Create: `tests/e2e/app.spec.js`

- [ ] **Step 1: Create test audio fixture**

```bash
mkdir -p tests/fixtures
# Create a minimal valid WAV file (44 bytes, silence)
node -e "
const buf = Buffer.alloc(44);
buf.write('RIFF', 0); buf.writeUInt32LE(36, 4);
buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22); buf.writeUInt32LE(8000, 24);
buf.writeUInt32LE(16000, 28); buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34); buf.write('data', 36);
buf.writeUInt32LE(0, 40);
require('fs').writeFileSync('tests/fixtures/silence.wav', buf);
console.log('Created silence.wav');
"
```

- [ ] **Step 2: Create tests/e2e/app.spec.js**

```js
// tests/e2e/app.spec.js
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('voice2english app', () => {
  test('homepage loads with correct title and UI elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('voice2english');
    await expect(page.getByRole('button', { name: /record/i })).toBeVisible();
    await expect(page.getByText(/Upload File/)).toBeVisible();
  });

  test('switches between Record and Upload tabs', async ({ page }) => {
    await page.goto('/');
    // Default is Record — mic button visible
    await expect(page.getByRole('button', { name: /start recording/i })).toBeVisible();
    // Switch to Upload
    await page.getByText('📎  Upload File').click();
    await expect(page.getByText('Drop audio file or click to browse')).toBeVisible();
  });

  test('uploads a file and shows pipeline results (mocked)', async ({ page }) => {
    // Intercept the pipeline API
    await page.route('/api/pipeline', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        transcript: 'नमस्ते दुनिया',
        translation: 'Hello world',
        timing: { sttMs: 1200, translateMs: 400, totalMs: 1600 },
      }),
    }));

    await page.goto('/');
    await page.getByText('📎  Upload File').click();

    const filePath = path.resolve('tests/fixtures/silence.wav');
    await page.locator('input[type=file]').setInputFiles(filePath);

    await expect(page.getByText('नमस्ते दुनिया')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Hello world')).toBeVisible();
    await expect(page.getByText('1.2s')).toBeVisible(); // STT time
  });

  test('evaluate shows BLEU and WER scores', async ({ page }) => {
    await page.route('/api/pipeline', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        transcript: 'नमस्ते',
        translation: 'Hello world',
        timing: { sttMs: 800, translateMs: 300, totalMs: 1100 },
      }),
    }));
    await page.route('/api/evaluate', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ bleu: 0.87, wer: 0.083 }),
    }));

    await page.goto('/');
    await page.getByText('📎  Upload File').click();
    const filePath = path.resolve('tests/fixtures/silence.wav');
    await page.locator('input[type=file]').setInputFiles(filePath);
    await expect(page.getByText('Hello world')).toBeVisible({ timeout: 10000 });

    // Fill reference and evaluate
    await page.getByPlaceholder(/reference/i).fill('Hello earth');
    await page.getByRole('button', { name: /run evaluation/i }).click();
    await expect(page.getByText('0.870')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('8.3%')).toBeVisible();
  });

  test('persists last result in localStorage on reload', async ({ page }) => {
    await page.route('/api/pipeline', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        transcript: 'नमस्ते',
        translation: 'Hello',
        timing: { sttMs: 500, translateMs: 200, totalMs: 700 },
      }),
    }));

    await page.goto('/');
    await page.getByText('📎  Upload File').click();
    const filePath = path.resolve('tests/fixtures/silence.wav');
    await page.locator('input[type=file]').setInputFiles(filePath);
    await expect(page.getByText('Hello')).toBeVisible({ timeout: 10000 });

    // Reload page — result should persist from localStorage
    await page.reload();
    await expect(page.getByText('Hello')).toBeVisible();
  });
});
```

- [ ] **Step 3: Run E2E tests**

```bash
npm run dev &
npx playwright test --reporter=list
```
Expected: All 5 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/app.spec.js tests/fixtures/silence.wav playwright.config.js
git commit -m "test: add Playwright E2E test suite"
```

---

## Task 10: Run full test suite

- [ ] **Step 1: Run all Jest tests**

```bash
npx jest --no-coverage
```
Expected: 16 tests pass across unit + integration suites.

- [ ] **Step 2: Run E2E tests**

```bash
npx playwright test --reporter=list
```
Expected: 5 E2E tests pass.

- [ ] **Step 3: Build for production**

```bash
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit if any fixes needed**

```bash
git add -A && git commit -m "fix: resolve any test/build issues"
```

---

## Task 11: Deploy to Vercel

- [ ] **Step 1: Link project to Vercel**

```bash
vercel link
```
Choose: existing project or create new named `voice2english-demo`.

- [ ] **Step 2: Add HF_TOKEN to Vercel env**

```bash
vercel env add HF_TOKEN production
```
When prompted, paste: `HF_TOKEN_REDACTED`

```bash
vercel env add HF_TOKEN preview
vercel env add HF_TOKEN development
```
Same value for all three.

- [ ] **Step 3: Deploy to production**

```bash
vercel --prod
```
Expected: Deployment URL printed, e.g. `https://voice2english-demo.vercel.app`

- [ ] **Step 4: Smoke test production**

Open the deployed URL. Verify:
- Page loads with sunset-horizon theme
- Switch tabs work
- Upload a file → pipeline runs (may take 10–15s first call while HF warms up)
- Evaluation panel works

- [ ] **Step 5: Final commit + push**

```bash
git add -A
git commit -m "chore: production deployment config"
git push origin main
```
