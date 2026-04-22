jest.mock('../../lib/groq.js', () => ({
  transcribeAudio: jest.fn(),
  translateText: jest.fn(),
}));

import { POST } from '../../app/api/pipeline/route.js';
import { transcribeAudio, translateText } from '../../lib/groq.js';

function makeRequest(fileBuffer, filename = 'test.wav', mimeType = 'audio/wav') {
  const formData = new FormData();
  formData.append('audio', new Blob([fileBuffer], { type: mimeType }), filename);
  return new Request('http://localhost/api/pipeline', { method: 'POST', body: formData });
}

beforeEach(() => jest.clearAllMocks());

test('returns transcript and translation with timing', async () => {
  transcribeAudio.mockResolvedValue({ text: 'नमस्ते दुनिया' });
  translateText.mockResolvedValue('Hello world');

  const res = await POST(makeRequest(Buffer.from('fake-audio')));
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
  expect((await res.json()).error).toMatch(/no audio/i);
});

test('returns 500 when HF throws', async () => {
  transcribeAudio.mockRejectedValue(new Error('Groq Whisper failed after 3 attempts: loading'));
  const res = await POST(makeRequest(Buffer.from('fake-audio')));
  expect(res.status).toBe(500);
});
