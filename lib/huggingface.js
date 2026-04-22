const WHISPER_URL   = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3';
const TRANSLATE_URL = 'https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-hi-en';
const MAX_RETRIES   = 3;
const BASE_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 2000;

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
    const loading = res.status === 503 || (body?.error ?? '').includes('loading');
    if (loading && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
      return hfRequest(url, options, attempt + 1);
    }
    const label = url.includes('whisper') ? 'HF Whisper' : 'HF Translate';
    throw new Error(`${label} failed after ${attempt} attempts: ${body?.error ?? res.status}`);
  }

  return res.json();
}

/**
 * Transcribes Hindi audio using Whisper large-v3.
 * @param {Buffer} audioBuffer
 * @param {string} mimeType
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
 * @returns {Promise<string>}
 */
export async function translateText(hindiText) {
  const data = await hfRequest(TRANSLATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: hindiText }),
  });
  return Array.isArray(data) ? (data[0]?.translation_text ?? '') : '';
}
