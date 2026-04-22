import { transcribeAudio, translateText } from '../../lib/groq.js';

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GROQ_API_KEY = 'gsk_test';
});

describe('transcribeAudio', () => {
  test('returns text on success', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'नमस्ते' }) });
    const result = await transcribeAudio(Buffer.from('audio'), 'audio/wav');
    expect(result.text).toBe('नमस्ते');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('retries on 503 then succeeds', async () => {
    fetch
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: { message: 'loading' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'hello' }) });
    const result = await transcribeAudio(Buffer.from('audio'), 'audio/wav');
    expect(result.text).toBe('hello');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('throws after 3 failed attempts', async () => {
    fetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: { message: 'loading' } }) });
    await expect(transcribeAudio(Buffer.from('audio'), 'audio/wav'))
      .rejects.toThrow('Groq Whisper failed after 3 attempts');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe('translateText', () => {
  test('returns translation on success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hello world' } }] }),
    });
    const result = await translateText('नमस्ते दुनिया');
    expect(result).toBe('Hello world');
  });

  test('retries on 503 then succeeds', async () => {
    fetch
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: { message: 'loading' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'Hello' } }] }) });
    const result = await translateText('नमस्ते');
    expect(result).toBe('Hello');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
