jest.mock('groq-sdk', () => {
  const mockCreate = jest.fn();
  const mockTranscribe = jest.fn();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      audio: { transcriptions: { create: mockTranscribe } },
      chat: { completions: { create: mockCreate } },
    })),
    __mockCreate: mockCreate,
    __mockTranscribe: mockTranscribe,
  };
});

import { transcribeAudio, translateText } from '../../lib/groq.js';
import Groq from 'groq-sdk';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GROQ_API_KEY = 'gsk_test';
});

function getMocks() {
  const instance = Groq.mock.results[0]?.value ?? Groq.mock.results.at(-1)?.value;
  return {
    transcribe: instance?.audio.transcriptions.create,
    chat: instance?.chat.completions.create,
  };
}

describe('transcribeAudio', () => {
  test('returns text on success', async () => {
    Groq.mockImplementation(() => ({
      audio: { transcriptions: { create: jest.fn().mockResolvedValue({ text: 'नमस्ते' }) } },
      chat: { completions: { create: jest.fn() } },
    }));
    const result = await transcribeAudio(Buffer.from('audio'), 'audio/wav');
    expect(result.text).toBe('नमस्ते');
  });

  test('retries on 503 then succeeds', async () => {
    const mockTranscribe = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('503 loading'), { status: 503 }))
      .mockResolvedValueOnce({ text: 'hello' });
    Groq.mockImplementation(() => ({
      audio: { transcriptions: { create: mockTranscribe } },
      chat: { completions: { create: jest.fn() } },
    }));
    const result = await transcribeAudio(Buffer.from('audio'), 'audio/wav');
    expect(result.text).toBe('hello');
    expect(mockTranscribe).toHaveBeenCalledTimes(2);
  });

  test('throws after 3 failed attempts', async () => {
    const mockTranscribe = jest.fn().mockRejectedValue(Object.assign(new Error('503 loading'), { status: 503 }));
    Groq.mockImplementation(() => ({
      audio: { transcriptions: { create: mockTranscribe } },
      chat: { completions: { create: jest.fn() } },
    }));
    await expect(transcribeAudio(Buffer.from('audio'), 'audio/wav'))
      .rejects.toThrow('Groq Whisper failed after 3 attempts');
    expect(mockTranscribe).toHaveBeenCalledTimes(3);
  });
});

describe('translateText', () => {
  test('returns translation on success', async () => {
    const mockChat = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Hello world' } }],
    });
    Groq.mockImplementation(() => ({
      audio: { transcriptions: { create: jest.fn() } },
      chat: { completions: { create: mockChat } },
    }));
    const result = await translateText('नमस्ते दुनिया');
    expect(result).toBe('Hello world');
  });

  test('retries on 503 then succeeds', async () => {
    const mockChat = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('503 loading'), { status: 503 }))
      .mockResolvedValueOnce({ choices: [{ message: { content: 'Hello' } }] });
    Groq.mockImplementation(() => ({
      audio: { transcriptions: { create: jest.fn() } },
      chat: { completions: { create: mockChat } },
    }));
    const result = await translateText('नमस्ते');
    expect(result).toBe('Hello');
    expect(mockChat).toHaveBeenCalledTimes(2);
  });
});
