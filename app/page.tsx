'use client';

import { useEffect, useRef, useState } from 'react';

const EMPTY_OUTPUT = 'Aquí se mostrará la minuta estructurada...';

export default function Home() {
  const [step, setStep] = useState(1);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [output, setOutput] = useState(EMPTY_OUTPUT);
  const [loading, setLoading] = useState<'transcribe' | 'minuta' | null>(null);
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMeetingDate(new Date().toISOString().slice(0, 10));
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const selectAudio = (file: File | null) => {
    setError('');
    if (!file) return;
    setAudioFile(file);
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        selectAudio(new File([blob], 'reunion.webm', { type: blob.type }));
        stream.getTracks().forEach((track) => track.stop());
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch (recordingError) {
      setError(`No se pudo acceder al micrófono: ${recordingError instanceof Error ? recordingError.message : 'permiso denegado'}`);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const transcribeAudio = async () => {
    setError('');
    if (!audioFile) {
      setError('Selecciona un archivo o graba la reunión antes de transcribir.');
      return;
    }
    setLoading('transcribe');
    try {
      const body = new FormData();
      body.append('file', audioFile);
      const response = await fetch('/api/transcribe', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo transcribir el audio.');
      setTranscript(data.text);
      setStep(2);
    } catch (transcriptionError) {
      setError(transcriptionError instanceof Error ? transcriptionError.message : 'Error de transcripción.');
    } finally {
      setLoading(null);
    }
  };

  const generateMinute = async () => {
    setError('');
    if (!transcript.trim()) {
      setError('Escribe o transcribe el contenido de la reunión antes de procesarlo.');
      return;
    }
    setLoading('minuta');
    try {
      const response = await fetch('/api/minuta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, meetingDate })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo generar la minuta.');
      setOutput(data.text);
      setStep(4);
    } catch (minuteError) {
      setError(minuteError instanceof Error ? minuteError.message : 'Error al generar la minuta.');
    } finally {
      setLoading(null);
    }
  };

  const downloadMinute = () => {
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Minuta_Psicologia_${meetingDate || 'sin-fecha'}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const saveMinute = () => {
    if (output === EMPTY_OUTPUT) return setError('No hay ningún contenido para guardar.');
    const saved = JSON.parse(localStorage.getItem('minutas_psicologia') || '[]');
    saved.push({ fecha: meetingDate, contenido: output, guardadoEl: new Date().toISOString() });
    localStorage.setItem('minutas_psicologia', JSON.stringify(saved));
    setError('Minuta guardada en el navegador.');
  };

  const formatTime = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const steps = ['Audio / Registro', 'Transcripción', 'Procesamiento IA', 'Revisión y Exportación'];

  return (
    <main className="container">
      <header><h1>Equipo de Psicología</h1><p>Sistema de elaboración de minutas con transcripción de audio e IA</p></header>
      <nav className="stepper" aria-label="Pasos">
        {steps.map((label, index) => <button key={label} className={step === index + 1 ? 'step-btn active' : 'step-btn'} onClick={() => setStep(index + 1)}>{index + 1}. {label}</button>)}
      </nav>
      {error && <div className="message">{error}</div>}

      {step === 1 && <section className="card"><h2>1. Registro de audio</h2><p>Obtén autorización de los integrantes antes de grabar.</p><div className="form-group"><label>Grabar reunión en tiempo real</label><div className="audio-controls"><button className="btn" onClick={startRecording} disabled={isRecording}>🔴 Iniciar grabación</button><button className="btn danger" onClick={stopRecording} disabled={!isRecording}>⏹️ Detener</button><span className={isRecording ? 'recording-status active' : 'recording-status'} />{formatTime}</div>{audioUrl && <audio src={audioUrl} controls />}</div><hr /><div className="form-group"><label htmlFor="audioFile">Cargar audio (.mp3, .wav, .m4a, .webm)</label><input id="audioFile" type="file" accept="audio/*" onChange={(event) => selectAudio(event.target.files?.[0] || null)} />{audioFile && <small>Seleccionado: {audioFile.name}</small>}</div><button className="btn success right" onClick={() => setStep(2)}>Siguiente: Transcribir ➔</button></section>}

      {step === 2 && <section className="card"><h2>2. Transcripción del audio</h2><p>El audio se envía al servidor Next.js, que lo reenvía a OpenAI. La clave nunca se expone al navegador.</p><button className="btn" onClick={transcribeAudio} disabled={loading === 'transcribe'}>{loading === 'transcribe' ? '⏳ Transcribiendo...' : '⚡ Transcribir audio seleccionado'}</button><div className="form-group"><label htmlFor="transcriptText">Transcripción (también puedes editarla)</label><textarea id="transcriptText" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="La transcripción aparecerá aquí..." /></div><button className="btn success right" onClick={() => setStep(3)}>Siguiente: Procesar con IA ➔</button></section>}

      {step === 3 && <section className="card"><h2>3. Procesamiento con IA</h2><div className="form-group"><label htmlFor="meetingDate">Fecha de la reunión</label><input id="meetingDate" type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} /></div><button className="btn" onClick={generateMinute} disabled={loading === 'minuta'}>{loading === 'minuta' ? '⏳ Generando...' : '🤖 Generar minuta con IA'}</button><div className="preview">{output}</div><button className="btn success right" onClick={() => setStep(4)}>Siguiente: Revisión ➔</button></section>}

      {step === 4 && <section className="card"><h2>4. Revisión humana y archivo</h2><p>Verifica nombres, fechas y posibles errores antes de finalizar.</p><textarea className="final" value={output === EMPTY_OUTPUT ? '' : output} onChange={(event) => setOutput(event.target.value)} /><div className="actions"><button className="btn" onClick={downloadMinute}>💾 Descargar .txt</button><button className="btn success" onClick={saveMinute}>📁 Guardar localmente</button></div></section>}
    </main>
  );
}
