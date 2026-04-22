import { POST } from '../../app/api/evaluate/route.js';

function req(body) {
  return new Request('http://localhost/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('returns bleu and wer for exact match', async () => {
  const res = await POST(req({ hypothesis: 'hello world', reference: 'hello world' }));
  const json = await res.json();
  expect(res.status).toBe(200);
  expect(json.bleu).toBeCloseTo(1.0, 1);
  expect(json.wer).toBeCloseTo(0, 1);
});

test('returns 400 when reference missing', async () => {
  const res = await POST(req({ hypothesis: 'hello' }));
  expect(res.status).toBe(400);
});

test('returns 400 when body is invalid JSON', async () => {
  const r = new Request('http://localhost/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not json',
  });
  const res = await POST(r);
  expect(res.status).toBe(400);
});
