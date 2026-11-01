import { useEffect, useMemo, useRef, useState } from 'react';

type VoiceAgentProps = { onPlayGame: () => void };
type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

type Answer = { keywords: string[]; text: string; action?: 'game' };

const answers: Answer[] = [
  { keywords: ['what is this', 'about', 'website', 'voice to ship'], text: 'This is Voice to Ship, an interactive portfolio for Omkar Shettigar. It is a way to explore his data science, AI and product thinking through work, experiments and a playable signal recovery challenge.' },
  { keywords: ['work', 'project', 'built', 'experience'], text: 'You can explore three case-study directions: knee osteoarthritis detection, the Ancient Modern Apparel product, and production AI systems at Catalysk. Each case note separates the problem, ownership and evidence.' },
  { keywords: ['game', 'play', 'signal lost'], text: 'Signal Lost is an eight-level mini-game about recovering a broken idea. It includes pattern recognition, routing, trade-offs, adaptation, memory and timing. You can start it from the visible game invitation.', action: 'game' },
  { keywords: ['voice lab', 'typing', 'dictation', 'experiment'], text: 'The Voice Lab is a local prototype for comparing a typed thought with text you paste as a dictation transcript. It does not request a microphone and it does not claim to be a measured Wispr Flow experiment.' },
  { keywords: ['hire', 'wispr', 'growth', 'thinking'], text: 'The Wispr section explains the hiring case: connect model behavior to work a person actually keeps, measure correction cost, and test a narrow first-user hypothesis without claiming results that have not been run.' },
  { keywords: ['contact', 'email', 'linkedin', 'github', 'talk'], text: 'You can contact Omkar through LinkedIn, email or GitHub in the final chapter. The full CV is available there too.' },
];

function getAnswer(input: string): Answer {
  const normalized = input.toLowerCase();
  return answers.find((answer) => answer.keywords.some((keyword) => normalized.includes(keyword))) ?? {
    keywords: [],
    text: 'I can explain the portfolio, point you to the work, describe the Voice Lab, open Signal Lost, or explain the Wispr hiring case. What would you like to explore?',
  };
}

function browserRecognition() {
  const source = window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof webkitSpeechRecognition };
  const Recognition = source.SpeechRecognition ?? source.webkitSpeechRecognition;
  return Recognition ? new Recognition() : null;
}

export function VoiceAgent({ onPlayGame }: VoiceAgentProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AgentState>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('Ask me what this is, what Omkar built, or say “play the game”.');
  const [textMode, setTextMode] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef('');
  const supportsSpeech = useMemo(() => typeof window !== 'undefined' && Boolean((window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition), []);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const speak = (text: string) => {
    setReply(text);
    if (!('speechSynthesis' in window)) { setState('idle'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onend = () => setState('idle');
    utterance.onerror = () => setState('idle');
    setState('speaking');
    window.speechSynthesis.speak(utterance);
  };

  const answer = (input: string) => {
    const result = getAnswer(input);
    setState('thinking');
    window.setTimeout(() => {
      speak(result.text);
      if (result.action === 'game') window.setTimeout(onPlayGame, 500);
    }, 220);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (transcriptRef.current.trim()) answer(transcriptRef.current.trim());
    else setState('idle');
  };

  const startListening = () => {
    window.speechSynthesis?.cancel();
    if (!supportsSpeech) return;
    const recognition = browserRecognition();
    if (!recognition) return;
    transcriptRef.current = '';
    setTranscript('');
    setState('listening');
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      transcriptRef.current = finalText || interimText;
      setTranscript(transcriptRef.current);
    };
    recognition.onerror = () => { recognitionRef.current = null; setState('idle'); setReply('I could not hear that. Try again, or type your question below.'); };
    recognition.onend = () => { if (recognitionRef.current === recognition) stopListening(); };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setState('idle'); }
  };

  const submitText = () => {
    if (!textMode.trim()) return;
    setTranscript(textMode.trim());
    setTextMode('');
    answer(textMode.trim());
  };

  return <>
    {!open && <button className="voice-agent-launcher" type="button" data-analytics-id="voice-agent-launcher" onClick={() => setOpen(true)}><span>LISTEN / ASK</span><strong>Talk to the site ↗</strong></button>}
    {open && <aside className="voice-agent" aria-label="Voice agent" role="dialog" aria-modal="false">
      <div className="voice-agent__top"><span>VOICE AGENT / LOCAL PROTOTYPE</span><button type="button" onClick={() => { recognitionRef.current?.abort(); window.speechSynthesis?.cancel(); setOpen(false); setState('idle'); }}>Close</button></div>
      <h2>Tell me what you’re <em>looking for.</em></h2>
      <p className="voice-agent__reply" aria-live="polite">{reply}</p>
      <div className="voice-agent__transcript"><span>{state === 'listening' ? 'LISTENING — RELEASE THE BUTTON WHEN YOU ARE DONE' : transcript ? 'LAST TURN' : 'NO TRANSCRIPT STORED'}</span><p>{transcript || 'Your words appear here only while this panel is open.'}</p></div>
      <div className="voice-agent__actions"><button className={`button ${state === 'listening' ? 'is-listening' : ''}`} type="button" data-analytics-id="voice-agent-talk" onClick={state === 'listening' ? stopListening : startListening} disabled={state === 'thinking'}>{state === 'listening' ? 'Stop and answer' : state === 'thinking' ? 'Thinking…' : state === 'speaking' ? 'Talk to interrupt' : 'Push to talk'} <span aria-hidden="true">{state === 'listening' ? '■' : '●'}</span></button><button className="voice-agent__mute" type="button" data-analytics-id="voice-agent-stop-speaking" onClick={() => { window.speechSynthesis?.cancel(); setState('idle'); }}>Stop voice</button></div>
      {!supportsSpeech && <p className="voice-agent__fallback">Speech recognition is not available in this browser. Type a question instead.</p>}
      <form className="voice-agent__text" onSubmit={(event) => { event.preventDefault(); submitText(); }}><label htmlFor="voice-agent-text">Text fallback</label><input id="voice-agent-text" value={textMode} onChange={(event) => setTextMode(event.target.value)} placeholder="Ask about the work, game or lab…" /><button type="submit" data-analytics-id="voice-agent-text-submit">Ask</button></form>
      <small className="voice-agent__note">Free browser speech tools · microphone starts only after your action · the site does not save audio or transcripts · it waits for you to finish before answering.</small>
    </aside>}
  </>;
}
