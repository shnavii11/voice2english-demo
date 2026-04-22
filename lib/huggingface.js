import { HfInference } from '@huggingface/inference';

const WHISPER_MODEL   = 'openai/whisper-large-v3-turbo';
const TRANSLATE_MODEL = 'Helsinki-NLP/opus-mt-hi-en';
const TRANSLATE_URL   = `https://api-inference.huggingface.co/models/${TRANSLATE_MODEL}`;
const MAX_RETRIES     = 3;
const BASE_DELAY_MS   = process.env.NODE_ENV === 'test' ? 0 : 3000;

function getClient() {
  return new HfInference(process.env.HF_TOKEN);
}

/**
 * Transcribes Hindi audio using Whisper large-v3-turbo via HF Inference SDK.
 * @param {Buffer} audioBuffer
 * @param {string} mimeType
 * @returns {Promise<{ text: string }>}
 */
export async function transcribeAudio(audioBuffer, mimeType = 'audio/wav', attempt = 1) {
  try {
    const hf = getClient();
    const result = await hf.automaticSpeechRecognition({
      model: WHISPER_MODEL,
      data: new Blob([audioBuffer], { type: mimeType }),
    });
    return { text: result.text ?? '' };
  } catch (err) {
    const isLoading = err?.message?.includes('503') || err?.message?.includes('loading') || err?.message?.includes('currently loading');
    if (isLoading && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
      return transcribeAudio(audioBuffer, mimeType, attempt + 1);
    }
    throw new Error(`HF Whisper failed after ${attempt} attempts: ${err?.message ?? err}`);
  }
}

/**
 * Translates Hindi text to English using Helsinki-NLP/opus-mt-hi-en.
 * @param {string} hindiText
 * @returns {Promise<string>}
 */
export async function translateText(hindiText, attempt = 1) {
  const res = await fetch(TRANSLATE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: hindiText }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const isLoading = res.status === 503 || (body?.error ?? '').includes('loading');
    if (isLoading && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
      return translateText(hindiText, attempt + 1);
    }
    throw new Error(`HF Translate failed after ${attempt} attempts: ${body?.error ?? res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? (data[0]?.translation_text ?? '') : '';
}
