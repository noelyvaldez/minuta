import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta configurar OPENAI_API_KEY en el servidor.' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Debes seleccionar o grabar un archivo de audio.' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'El archivo de audio está vacío.' }, { status: 400 });
    }

    // OpenAI's audio upload limit is 25 MB.
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'El audio supera el límite de 25 MB.' }, { status: 413 });
    }

    const upstream = new FormData();
    upstream.append('file', file, file.name || 'meeting.webm');
    upstream.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe');
    upstream.append('response_format', 'json');
    upstream.append('language', 'es');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'OpenAI no pudo transcribir el audio.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ text: data.text || '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado al transcribir el audio.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
