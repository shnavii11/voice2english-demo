import { NextResponse } from 'next/server';
import { transcribeAudio, translateText } from '@/lib/groq';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audioFile = formData.get('audio');
  if (!audioFile || typeof audioFile === 'string') {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  try {
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || 'audio/wav';

    const sttStart = Date.now();
    const { text: transcript } = await transcribeAudio(audioBuffer, mimeType);
    const sttMs = Date.now() - sttStart;

    const translateStart = Date.now();
    const translation = await translateText(transcript);
    const translateMs = Date.now() - translateStart;

    return NextResponse.json({
      transcript,
      translation,
      timing: { sttMs, translateMs, totalMs: sttMs + translateMs },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
