import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta configurar OPENAI_API_KEY en el servidor.' }, { status: 500 });
    }

    const { transcript, meetingDate } = await request.json();
    if (typeof transcript !== 'string' || !transcript.trim()) {
      return NextResponse.json({ error: 'La transcripción está vacía.' }, { status: 400 });
    }

    const prompt = `Actúa como asistente administrativo del equipo de Psicología. Genera una minuta formal basada exclusivamente en esta transcripción.

Normas:
1. Elimina muletillas, repeticiones y conversaciones irrelevantes.
2. Usa exactamente estos apartados: 1. INFORMES, 2. PASANTES, 3. COLECTIVOS, 4. ACUERDOS Y PENDIENTES.
3. Si un apartado no tiene información, escribe "Sin asuntos tratados".
4. En acuerdos, indica responsable y fecha límite solo si aparecen explícitamente.
5. No inventes ni supongas información.

Fecha de la reunión: ${meetingDate || 'No especificada'}

Transcripción:
${transcript}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MINUTA_MODEL || 'gpt-4o-mini',
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || 'No se pudo generar la minuta.' }, { status: response.status });
    }

    return NextResponse.json({ text: data.choices?.[0]?.message?.content || '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado al generar la minuta.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
