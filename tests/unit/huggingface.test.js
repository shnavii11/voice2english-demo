// Mock the HF Inference SDK
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    automaticSpeechRecognition: jest.fn(),
  })),
}));

import { transcribeAudio, translateText } from '../../lib/huggingface.js';
import { HfInference } from '@huggingface/inference';

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  process.env.HF_TOKEN = 'hf_test';
});

describe('transcribeAudio', () => {
  test('returns text on success', async () => {
    const mockASR = jest.fn().mockResolvedValue({ text: 'नमस्ते' });
    HfInference.mockImplementation(() => ({ automaticSpeechRecognition: mockASR }));

    const result = await transcribeAudio(Buffer.from('audio'), 'audio/wav');
    expect(result.text).toBe('नमस्ते');
    expect(mockASR).toHaveBeenCalledTimes(1);
  });

  test('retries on loading error then succeeds', async () => {
    const mockASR = jest.fn()
      .mockRejectedValueOnce(new Error('503 Model is currently loading'))
      .mockResolvedValueOnce({ text: 'hello' });
    HfInference.mockImplementation(() => ({ automaticSpeechRecognition: mockASR }));

    const result = await transcribeAudio(Buffer.from('audio'), 'audio/wav');
    expect(result.text).toBe('hello');
    expect(mockASR).toHaveBeenCalledTimes(2);
  });

  test('throws after 3 failed attempts', async () => {
    const mockASR = jest.fn().mockRejectedValue(new Error('503 loading'));
    HfInference.mockImplementation(() => ({ automaticSpeechRecognition: mockASR }));

    await expect(transcribeAudio(Buffer.from('audio'), 'audio/wav'))
      .rejects.toThrow('HF Whisper failed after 3 attempts');
    expect(mockASR).toHaveBeenCalledTimes(3);
  });
});

describe('translateText', () => {
  test('returns translation on success', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [{ translation_text: 'Hello world' }] });
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
