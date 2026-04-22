import Groq from 'groq-sdk';

const WHISPER_MODEL  = 'whisper-large-v3-turbo';
const LLAMA_MODEL    = 'llama-3.1-8b-instant';
const MAX_RETRIES    = 3;
const BASE_DELAY_MS  = process.env.NODE_ENV === 'test' ? 0 : 2000;

function getClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function transcribeAudio(audioBuffer, mimeType = 'audio/wav', attempt = 1) {
  try {
    const groq = getClient();
    const ext = mimeType.split('/')[1]?.split(';')[0] || 'wav';
    const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });
    const result = await groq.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      language: 'hi',
    });
    return { text: result.text ?? '' };
  } catch (err) {
    const isLoading = err?.status === 503 || err?.message?.includes('loading');
    if (isLoading && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
      return transcribeAudio(audioBuffer, mimeType, attempt + 1);
    }
    throw new Error(`Groq Whisper failed after ${attempt} attempts: ${err?.message ?? err}`);
  }
}

export async function translateText(hindiText, attempt = 1) {
  try {
    const groq = getClient();
    const chat = await groq.chat.completions.create({
      model: LLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a professional translator. Translate the Hindi text to English. Return only the English translation, nothing else.' },
        { role: 'user', content: hindiText },
      ],
      temperature: 0.1,
      max_tokens: 512,
    });
    return chat.choices[0]?.message?.content?.trim() ?? '';
  } catch (err) {
    const isLoading = err?.status === 503 || err?.message?.includes('loading');
    if (isLoading && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
      return translateText(hindiText, attempt + 1);
    }
    throw new Error(`Groq Translate failed after ${attempt} attempts: ${err?.message ?? err}`);
  }
}
