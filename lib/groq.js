const GROQ_BASE      = 'https://api.groq.com/openai/v1';
const WHISPER_MODEL  = 'whisper-large-v3-turbo';
const LLAMA_MODEL    = 'llama-3.1-8b-instant';
const MAX_RETRIES    = 3;
const BASE_DELAY_MS  = process.env.NODE_ENV === 'test' ? 0 : 2000;

export async function transcribeAudio(audioBuffer, mimeType = 'audio/wav', attempt = 1) {
  const ext = mimeType.split('/')[1]?.split(';')[0] || 'wav';
  const form = new FormData();
  form.append('file', new Blob([audioBuffer], { type: mimeType }), `audio.${ext}`);
  form.append('model', WHISPER_MODEL);
  form.append('language', 'hi');
  form.append('response_format', 'json');

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message ?? String(res.status);
    const isLoading = res.status === 503 || msg.includes('loading');
    if (isLoading && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
      return transcribeAudio(audioBuffer, mimeType, attempt + 1);
    }
    throw new Error(`Groq Whisper failed after ${attempt} attempts: ${msg}`);
  }

  const data = await res.json();
  return { text: data.text ?? '' };
}

export async function translateText(hindiText, attempt = 1) {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a professional translator. Translate the Hindi text to English. Return only the English translation, nothing else.' },
        { role: 'user', content: hindiText },
      ],
      temperature: 0.1,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message ?? String(res.status);
    const isLoading = res.status === 503 || msg.includes('loading');
    if (isLoading && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
      return translateText(hindiText, attempt + 1);
    }
    throw new Error(`Groq Translate failed after ${attempt} attempts: ${msg}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}
