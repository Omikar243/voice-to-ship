import { useEffect, useRef, useState } from 'react';

type Props = { onPlayGame: () => void };
type LiveState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

type LiveToken = { token: string; model: string };

const serviceUrl = (import.meta.env.VITE_VOICE_SERVICE_URL as string | undefined)?.replace(/\/$/, '');
const liveEndpoint = (token: string) => `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token)}`;

function pcmToBase64(input: Float32Array) {
  const pcm = new Int16Array(input.length);
  for (let index = 0; index < input.length; index += 1) pcm[index] = Math.max(-1, Math.min(1, input[index])) * 0x7fff;
  let binary = '';
  const bytes = new Uint8Array(pcm.buffer);
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

function base64ToPcm(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Int16Array(bytes.buffer);
}

export function GeminiLiveVoiceAgent({ onPlayGame }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LiveState>('idle');
  const [reply, setReply] = useState('Native Gemini audio is ready when you are.');
  const socketRef = useRef<WebSocket | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextAudioTimeRef = useRef(0);

  useEffect(() => () => stop(), []);

  const stop = () => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    socketRef.current?.close();
    socketRef.current = null;
    void contextRef.current?.close();
    contextRef.current = null;
    setState('idle');
  };

  const playPcm = (data: string) => {
    const context = contextRef.current;
    if (!context) return;
    const pcm = base64ToPcm(data);
    const buffer = context.createBuffer(1, pcm.length, 24_000);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < pcm.length; index += 1) channel[index] = pcm[index] / 0x7fff;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const start = Math.max(context.currentTime, nextAudioTimeRef.current);
    source.start(start);
    nextAudioTimeRef.current = start + buffer.duration;
    setState('speaking');
    source.onended = () => { if (context.currentTime >= nextAudioTimeRef.current - 0.03) setState('listening'); };
  };

  const start = async () => {
    if (!serviceUrl) {
      setState('error');
      setReply('Native voice is not configured yet. The text voice agent remains available.');
      return;
    }
    setState('connecting');
    try {
      const tokenResponse = await fetch(`${serviceUrl}/live-token`, { method: 'POST' });
      if (!tokenResponse.ok) throw new Error('Token service unavailable');
      const { token, model } = await tokenResponse.json() as LiveToken;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      const context = new AudioContext({ sampleRate: 16_000 });
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const socket = new WebSocket(liveEndpoint(token));
      socket.onopen = () => {
        socket.send(JSON.stringify({ setup: { model: `models/${model}`, responseModalities: ['AUDIO'] } }));
        source.connect(processor);
        processor.connect(context.destination);
        setState('listening');
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as { serverContent?: { modelTurn?: { parts?: Array<{ inlineData?: { data?: string } }> }; turnComplete?: boolean } };
        for (const part of message.serverContent?.modelTurn?.parts ?? []) if (part.inlineData?.data) playPcm(part.inlineData.data);
        if (message.serverContent?.turnComplete) setState('listening');
      };
      socket.onerror = () => { setState('error'); setReply('The native voice connection failed. Try again or use the text voice agent.'); };
      socket.onclose = () => { if (state !== 'error') setState('idle'); };
      processor.onaudioprocess = (event) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({ realtimeInput: { audio: { data: pcmToBase64(event.inputBuffer.getChannelData(0)), mimeType: 'audio/pcm;rate=16000' } } }));
      };
      contextRef.current = context;
      streamRef.current = stream;
      processorRef.current = processor;
      socketRef.current = socket;
    } catch {
      stop();
      setState('error');
      setReply('Native voice could not start. Check microphone access or use the text voice agent.');
    }
  };

  if (!serviceUrl) return null;

  return <>
    {!open && <button className="voice-agent-launcher voice-agent-launcher--live" type="button" onClick={() => setOpen(true)}><span>NATIVE AUDIO</span><strong>Talk live ↗</strong></button>}
    {open && <aside className="voice-agent" aria-label="Native Gemini voice agent" role="dialog">
      <div className="voice-agent__top"><span>GEMINI LIVE / NATIVE AUDIO</span><button type="button" onClick={() => { stop(); setOpen(false); }}>Close</button></div>
      <h2>Speak with the <em>portfolio.</em></h2>
      <p className="voice-agent__reply" aria-live="polite">{reply}</p>
      <div className="voice-agent__actions"><button className={`button ${state === 'listening' ? 'is-listening' : ''}`} type="button" onClick={state === 'idle' || state === 'error' ? start : stop}>{state === 'connecting' ? 'Connecting…' : state === 'listening' ? 'Stop listening' : state === 'speaking' ? 'Stop voice' : 'Start native voice'} <span aria-hidden="true">{state === 'listening' ? '■' : '●'}</span></button><button className="voice-agent__mute" type="button" onClick={() => { stop(); setOpen(false); }}>Close</button></div>
      <small className="voice-agent__note">Audio streams directly between your browser and Gemini using a short-lived session token.</small>
    </aside>}
  </>;
}
