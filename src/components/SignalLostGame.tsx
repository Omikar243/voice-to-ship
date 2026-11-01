import { useEffect, useMemo, useState } from 'react';

type SignalLostGameProps = { onExit: () => void };
const levels = ['Find the signal', 'Connect the pieces', 'Make the call', 'The unexpected failure', 'Ship it'];
const nodeOrder = [0, 2, 1, 3];

export function SignalLostGame({ onExit }: SignalLostGameProps) {
  const [started, setStarted] = useState(false);
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [message, setMessage] = useState('');
  const [selection, setSelection] = useState<number[]>([]);
  const [repairs, setRepairs] = useState<number[]>([]);
  const [pulse, setPulse] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    try { setBest(Number(localStorage.getItem('signal-lost-best') ?? 0)); } catch { /* local best is optional */ }
  }, []);

  useEffect(() => {
    if (!started || level !== 4) return undefined;
    const timer = window.setInterval(() => setPulse((value) => (value + 7) % 101), 120);
    return () => window.clearInterval(timer);
  }, [started, level]);

  const progress = useMemo(() => `${(level / levels.length) * 100}%`, [level]);

  const finishLevel = (points: number, text: string) => {
    const nextScore = score + points;
    setScore(nextScore);
    setMessage(text);
    window.setTimeout(() => {
      setMessage('');
      setSelection([]);
      setRepairs([]);
      if (level === levels.length - 1) {
        setStarted(false);
        try {
          if (nextScore > best) { localStorage.setItem('signal-lost-best', String(nextScore)); setBest(nextScore); }
        } catch { /* local best is optional */ }
      } else setLevel((value) => value + 1);
    }, 650);
  };

  const wrong = () => {
    setEnergy((value) => Math.max(0, value - 1));
    setMessage(energy <= 1 ? 'The signal collapsed. Restart and try a different route.' : 'The signal flickers. Try another approach.');
    setSelection([]);
    setRepairs([]);
    if (energy <= 1) setStarted(false);
  };

  const restart = () => { setStarted(true); setLevel(0); setScore(0); setEnergy(3); setMessage(''); setSelection([]); setRepairs([]); };

  return <div className="signal-lost" role="dialog" aria-modal="true" aria-labelledby="signal-lost-title">
    <div className="signal-lost__top"><span>VOICE TO SHIP / PLAYABLE EXPERIENCE</span><button type="button" onClick={onExit}>Exit game</button></div>
    {!started ? <div className="signal-lost__landing"><p className="eyebrow">A 5-LEVEL SIGNAL RECOVERY CHALLENGE</p><h2 id="signal-lost-title">Signal <em>Lost.</em></h2><p>An idea is breaking apart. Find the pattern, route the pieces, make the call and ship something that works.</p><div className="signal-lost__meta"><span>KEYBOARD + MOUSE</span><span>NO LOGIN</span><span>LOCAL BEST: {best}</span></div><button className="button" type="button" data-analytics-id="signal-lost-start" onClick={restart}>{score ? 'Play again' : 'Start the game'} <span aria-hidden="true">↗</span></button></div> : <div className="signal-lost__play"><div className="signal-lost__hud"><span>LEVEL 0{level + 1} / 05</span><span>{levels[level]}</span><span>ENERGY {'●'.repeat(energy)}{'○'.repeat(3 - energy)}</span></div><div className="signal-lost__progress"><i style={{ width: progress }} /></div><div className="signal-lost__board">
      {level === 0 && <><h3>Find the signal</h3><p>One waveform is stable. The others are noise. Select the pattern that repeats.</p><div className="signal-patterns">{['〰╱〰╱〰', '╱〰╲╱╲', '〰〰╱╲〰'].map((pattern, index) => <button key={pattern} data-analytics-id={`signal-lost-level-1-pattern-${index + 1}`} className={index === 1 ? 'signal-pattern is-correct' : 'signal-pattern'} type="button" onClick={() => index === 1 ? finishLevel(100, 'Signal found.') : wrong()}>{pattern}</button>)}</div></>}
      {level === 1 && <><h3>Connect the pieces</h3><p>Route the signal through every node in the working order.</p><div className="signal-nodes">{[0, 1, 2, 3].map((node) => <button key={node} data-analytics-id={`signal-lost-level-2-node-${node + 1}`} className={selection.includes(node) ? 'is-selected' : ''} type="button" onClick={() => { const next = [...selection, node]; setSelection(next); if (next.length === nodeOrder.length) nodeOrder.every((value, index) => value === next[index]) ? finishLevel(120, 'Path restored.') : wrong(); }}>{node + 1}</button>)}</div></>}
      {level === 2 && <><h3>Make the call</h3><p>Energy is limited. Repair exactly two components that keep the system useful.</p><div className="repair-grid">{['Archive', 'Signal core', 'Output'].map((item, index) => <button key={item} data-analytics-id={`signal-lost-level-3-repair-${index + 1}`} className={repairs.includes(index) ? 'is-selected' : ''} type="button" onClick={() => setRepairs((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])}>{item}<small>{index === 1 ? 'required' : 'optional'}</small></button>)}</div><button className="button button--small" type="button" data-analytics-id="signal-lost-level-3-submit" onClick={() => repairs.length === 2 && repairs.includes(1) ? finishLevel(140, 'The useful path wins.') : wrong()}>Commit the repair ↗</button></>}
      {level === 3 && <><h3>The unexpected failure</h3><p>The first route is blocked. Adapt instead of repeating the same approach.</p><div className="signal-choice-row"><button type="button" data-analytics-id="signal-lost-level-4-repeat" onClick={wrong}>Retry the broken route</button><button type="button" data-analytics-id="signal-lost-level-4-adapt" onClick={() => finishLevel(160, 'The system adapts.')}>Change the route</button></div></>}
      {level === 4 && <><h3>Ship it</h3><p>Release the signal when the charge enters the highlighted window.</p><div className="signal-meter"><i style={{ width: `${pulse}%` }} /><span>40 — 70</span></div><button className="button" type="button" data-analytics-id="signal-lost-level-5-ship" onClick={() => pulse >= 40 && pulse <= 70 ? finishLevel(200, 'Signal shipped.') : wrong()}>Ship the signal ↗</button></>}
    </div>{message && <p className="signal-lost__message" aria-live="polite">{message}</p>}<div className="signal-lost__footer"><span>SCORE {score}</span><span>EVERY CHOICE CHANGES THE ROUTE</span></div></div>}
  </div>;
}
