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
    return NextResponse.json(
      { error: 'hypothesis and reference are required' },
      { status: 400 }
    );
  }

  const bleu = computeBLEU(String(hypothesis), String(reference));
  const wer  = computeWER(String(hypothesis), String(reference));

  return NextResponse.json({ bleu, wer });
}
