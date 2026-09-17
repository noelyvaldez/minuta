# Minuta de Psicología (Next.js)

La aplicación ahora usa Next.js para que el audio se procese en el servidor y pueda enviarse a OpenAI sin exponer la API key en el navegador.

## Ejecutar localmente

```bash
npm install
cp .env.example .env.local
# Edita .env.local y añade OPENAI_API_KEY
npm run dev
```

Abre `http://localhost:3000`.

## Flujo de audio

1. El usuario graba audio con `MediaRecorder` o selecciona un archivo.
2. `app/api/transcribe/route.ts` recibe el archivo como `multipart/form-data`.
3. El servidor lo reenvía a `https://api.openai.com/v1/audio/transcriptions` usando `gpt-4o-mini-transcribe`.
4. La transcripción se puede editar y después se envía a `app/api/minuta/route.ts` para generar la minuta.

El límite de esta implementación es 25 MB por archivo. La API key debe existir únicamente en `.env.local` o en las variables de entorno del despliegue; no la pongas en `NEXT_PUBLIC_*`.

El `index.html` original se conserva como referencia, pero Next.js sirve la interfaz desde `app/page.tsx`.
