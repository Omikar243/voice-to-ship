import { useEffect, useState } from 'react';
import { Atmosphere } from './components/Atmosphere';
import { BlurText } from './components/BlurText';
import { EvolvingSignal } from './components/EvolvingSignal';
import { LenisRoot } from './components/LenisRoot';
import { AnalyticsClient, analyticsEnabledForCurrentDevice, openAnalyticsSettings } from './components/AnalyticsClient';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';

type Chapter = { id: string; label: string; short: string };

type Project = {
  id: string;
  number: string;
  title: string;
  category: string;
  context: string;
};

const chapters: Chapter[] = [
  { id: 'hero', label: 'The Signal', short: '01' },
  { id: 'story', label: 'The Direction', short: '02' },
  { id: 'work', label: 'The Connections', short: '03' },
  { id: 'lab', label: 'The Exploration', short: '04' },
  { id: 'lessons', label: 'The Interruption', short: '05' },
  { id: 'wispr', label: 'The Convergence', short: '06' },
  { id: 'contact', label: 'The Loop', short: '07' },
];

const projects: Project[] = [
  {
    id: 'knee-oa',
    number: '01',
    title: 'Knee osteoarthritis detection using CNN',
    category: 'Computer vision / healthcare',
    context: 'A human question behind an image-classification problem. The scope, ownership and evidence still need Omkar’s review.',
  },
  {
    id: 'sustainable-data',
    number: '02',
    title: 'Sustainability & financial data systems',
    category: 'Applied data / responsible disclosure',
    context: 'A real-world data problem. Public-safe details, personal contribution and outcomes are intentionally left open.',
  },
  {
    id: 'gridsfm',
    number: '03',
    title: 'Risk-controlled GridSFM research',
    category: 'Research in progress',
    context: 'An ongoing question about balancing predictive performance with power-system feasibility. Confirm status before publication.',
  },
];

const projectFields = [
  ['Problem', 'Add the specific problem and who experienced it.'],
  ['Ownership', 'Separate what Omkar owned from what the wider team did.'],
  ['Decisions', 'Add one consequential decision and the trade-off behind it.'],
  ['Process', 'Describe the experiments, revisions and tools that mattered.'],
  ['Outcome & evidence', 'Add only verified, public-safe results or links. No metrics have been supplied.'],
];

const ideaRounds = [
  {
    title: 'Find the friction',
    prompt: 'What everyday moment could be a little easier?',
    options: ['Ideas disappear between tasks', 'A useful draft takes too long to start', 'Good notes are hard to reuse'],
  },
  {
    title: 'Choose who feels it',
    prompt: 'Who would notice the difference first?',
    options: ['A student', 'A creator', 'A builder'],
  },
  {
    title: 'Ship the smallest proof',
    prompt: 'What would you test before building more?',
    options: ['Try one real workflow', 'Make a rough clickable sketch', 'Ask someone to complete one task'],
  },
];

const decisionOptions = [
  {
    id: 'discovery',
    title: 'Find a task worth trying',
    lens: 'Show one job, not “voice is faster.”',
    experiment: 'First-cohort hypothesis: Bengaluru campus creators who regularly draft short scripts or captions. Show a consented, task-led example, then invite a real first try instead of optimizing for views.',
    signal: 'Proposed: qualified people who choose to start the task and reach the first useful output. No baseline exists.',
    next: 'If the story earns attention but not a first try, revisit audience, task and context before adding reach.',
    guardrail: 'A small exploratory cohort can surface friction; it cannot estimate India-wide demand or market size.',
  },
  {
    id: 'first-output',
    title: 'Earn the first kept draft',
    lens: 'Define activation by an output the user accepts.',
    experiment: 'Ask each participant to complete the same short script or caption in their normal text field: once by typing and once with Flow. Counterbalance the order and let them review both before deciding what they would keep.',
    signal: 'Proposed: first draft kept after review. Also track time-to-useful-draft, corrections/rework, and a simple output-quality rubric.',
    next: 'If voice is faster but causes more rework or lower quality, diagnose task fit, recognition or cleanup before scaling the message.',
    guardrail: 'Use the same supported device and app for both attempts. Do not collect audio or paste either draft into portfolio analytics.',
  },
  {
    id: 'repeat',
    title: 'Find where it fits a day',
    lens: 'Context and comfort decide whether a habit forms.',
    experiment: 'With consent, follow up after seven days: when did people choose voice, where did they switch back to the keyboard, and why? Separate task, device, language and setting rather than averaging them together.',
    signal: 'Proposed: voluntary repeat use within seven days, paired with the context and friction behind it. This is not Wispr retention data.',
    next: 'Improve the highest-friction context and keep typing complementary; do not assume voice should replace every input.',
    guardrail: 'Ask only for consented, coded observations. Keep private notes separate from anonymous site events and define deletion before collecting them.',
  },
  {
    id: 'sharing',
    title: 'Earn a recommendation',
    lens: 'Share the finished value, not private speech.',
    experiment: 'Offer participants an optional way to share a sanitized artifact made with Flow. Do not preselect sharing, expose the spoken transcript or pressure people to post.',
    signal: 'Proposed: voluntary shares that lead another suitable user to a first useful output—not raw views or impressions.',
    next: 'Scale only if the shared proof brings qualified first use and repeat value, not just reach.',
    guardrail: 'Get explicit consent for every artifact. A participant can decline without losing access or being counted as a failure.',
  },
];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="arrow-mark">
      {diagonal ? <path d="M5 15 15 5M6 5h9v9" /> : <path d="M3 10h13m-5-5 5 5-5 5" />}
    </svg>
  );
}

function App() {
  const [activeChapter, setActiveChapter] = useState('hero');
  const [menuOpen, setMenuOpen] = useState(false);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [labMode, setLabMode] = useState<'typed' | 'dictated'>('typed');
  const [typedThought, setTypedThought] = useState('I have a rough idea for a project, but I need a clear first step.');
  const [dictatedThought, setDictatedThought] = useState('I keep thinking about a small tool that could help people turn a messy first thought into one useful action.');
  const [briefMode, setBriefMode] = useState<'typed' | 'dictated' | null>(null);
  const [ideaRunning, setIdeaRunning] = useState(false);
  const [ideaExpired, setIdeaExpired] = useState(false);
  const [ideaComplete, setIdeaComplete] = useState(false);
  const [ideaStep, setIdeaStep] = useState(0);
  const [ideaSeconds, setIdeaSeconds] = useState(60);
  const [ideaAnswers, setIdeaAnswers] = useState<string[]>([]);
  const [decisionChoice, setDecisionChoice] = useState('discovery');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const updateChapter = () => {
      const marker = window.innerHeight * 0.39;
      const visible = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]')).find((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top <= marker && bounds.bottom >= marker;
      });
      if (visible?.dataset.chapter) setActiveChapter(visible.dataset.chapter);
    };
    updateChapter();
    window.addEventListener('scroll', updateChapter, { passive: true });
    window.addEventListener('resize', updateChapter);
    return () => {
      window.removeEventListener('scroll', updateChapter);
      window.removeEventListener('resize', updateChapter);
    };
  }, []);

  useEffect(() => {
    if (!ideaRunning || ideaComplete) return undefined;
    const timer = window.setInterval(() => {
      setIdeaSeconds((seconds) => {
        if (seconds <= 1) {
          setIdeaRunning(false);
          setIdeaExpired(true);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [ideaRunning, ideaComplete]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const currentThought = labMode === 'typed' ? typedThought : dictatedThought;
  const selectedDecision = decisionOptions.find((option) => option.id === decisionChoice) ?? decisionOptions[0];

  const shapeThought = () => {
    setBriefMode(labMode);
  };

  const beginIdeaEngine = () => {
    setIdeaAnswers([]);
    setIdeaStep(0);
    setIdeaSeconds(60);
    setIdeaExpired(false);
    setIdeaComplete(false);
    setIdeaRunning(true);
  };

  const answerIdea = (answer: string) => {
    const next = [...ideaAnswers, answer];
    setIdeaAnswers(next);
    if (ideaStep === ideaRounds.length - 1) {
      setIdeaComplete(true);
      setIdeaRunning(false);
    } else {
      setIdeaStep((step) => step + 1);
    }
  };

  const copyDecision = async () => {
    const content = `${selectedDecision.title}\n\n${selectedDecision.experiment}\n\n${selectedDecision.signal}\n\nGuardrail: ${selectedDecision.guardrail}`;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (window.location.pathname === '/insights') return <AnalyticsDashboard />;

  return (
    <LenisRoot>
      <div className="site-shell">
        <a className="skip-link" href="#main-content">Skip to the portfolio</a>
        <EvolvingSignal
          activeChapter={activeChapter}
          activeProject={openProject ?? activeProject}
          activeBranch={activeChapter === 'lab' ? labMode : null}
        />

        <header className="site-header">
          <a className="wordmark" href="#hero" aria-label="VOICE TO SHIP, return to the beginning">
            <span className="wordmark__symbol" aria-hidden="true"><span /><span /><span /><i /></span>
            <span className="wordmark__text">VOICE <b>TO</b> SHIP</span>
          </a>
          <div className="header-meta"><span>OMKAR SHETTIGAR</span><span className="header-meta__dot" /><span>BENGALURU, IN</span></div>
          <div className="header-actions">
            <a className="header-shortcut" href="#work">Skip to work <Arrow diagonal /></a>
            <button className="chapter-toggle" type="button" aria-expanded={menuOpen} aria-controls="chapter-menu" onClick={() => setMenuOpen((open) => !open)}>
              <span>{menuOpen ? 'Close' : 'Chapters'}</span><span className={`menu-glyph ${menuOpen ? 'is-open' : ''}`} aria-hidden="true"><i /><i /></span>
            </button>
          </div>
          {menuOpen && (
            <nav className="chapter-menu" id="chapter-menu" aria-label="Chapter navigation">
              <p className="eyebrow">FOLLOW THE SIGNAL</p>
              {chapters.map((chapter) => (
                <a key={chapter.id} href={`#${chapter.id}`} className={activeChapter === chapter.id ? 'is-current' : ''} onClick={() => setMenuOpen(false)}>
                  <span>{chapter.short}</span>{chapter.label}<Arrow diagonal />
                </a>
              ))}
            </nav>
          )}
        </header>

        <main id="main-content">
          <section className="hero section-shell" id="hero" data-chapter="hero">
            <Atmosphere />
            <div className="hero__copy">
              <p className="eyebrow hero__eyebrow"><span className="eyebrow-dot" /> AN INTERACTIVE DOCUMENTARY <span className="eyebrow-separator">/</span> A BUILDER IN BENGALURU</p>
              <h1 aria-label="I build things to understand how they work.">
                <span className="hero-title__line"><BlurText text="I build things" delay={0.035} /></span>
                <span className="hero-title__line"><BlurText text="to understand" delay={0.06} /></span>
                <span className="hero-title__line hero-title__last"><BlurText text="how they" delay={0.08} /> <em><BlurText text="work." delay={0.1} /></em></span>
              </h1>
              <p className="hero__intro">Data scientist by profession. Builder by instinct. Curious about what happens when ideas meet execution.</p>
              <p className="hero__subline">A journey through ideas, experiments, mistakes and things shipped.</p>
              <div className="hero__signal-caption"><span>01 — THE SIGNAL</span><span>EVERY BUILD STARTS WITH A THOUGHT</span></div>
            </div>

            <div className="hero__visual" aria-hidden="true">
              <div className="signal-orbit signal-orbit--one" />
              <div className="signal-orbit signal-orbit--two" />
              <svg className="hero-wave" viewBox="0 0 600 320" fill="none">
                <path className="hero-wave__echo" d="M12 160h50l13-17 15 31 18-88 17 140 18-102 17 45 15-22h34l15-8 15 18 16-37 15 59 17-74 16 98 18-48 16 18 18-8h22l16-4 14 7 16-11 14 18 17-23 16 27 19-12 14 7h63" />
                <path className="hero-wave__path" d="M12 160h50l13-17 15 31 18-88 17 140 18-102 17 45 15-22h34l15-8 15 18 16-37 15 59 17-74 16 98 18-48 16 18 18-8h22l17 2c26 2 31-18 48-18 20 0 21 26 40 26 18 0 20-17 35-17h81" />
                <circle className="hero-wave__node" cx="516" cy="170" r="5" />
                <path className="hero-wave__baseline" d="M12 250h576" />
              </svg>
              <div className="hero__visual-note"><span>VOICE → DIRECTION → WORK</span><span>AN IDEA, IN MOTION</span></div>
            </div>

            <div className="hero__bottom">
              <div className="hero__scroll"><span className="scroll-line" /><span>SCROLL TO FOLLOW THE SIGNAL</span></div>
              <div className="hero__quicklinks" aria-label="Choose a starting point">
                <a href="#work">Show me what I've built <Arrow /></a>
                <a href="#decision-room">Show me how I think <Arrow /></a>
                <a href="#lessons">Show me what I've learned <Arrow /></a>
              </div>
            </div>
          </section>

          <section className="experience-index section-shell" aria-labelledby="choose-title">
            <div className="section-kicker"><span>START ANYWHERE</span><span>NO GATE. NO FORM. NO AUDIO.</span></div>
            <h2 id="choose-title" className="experience-index__title">Choose your <em>experience.</em></h2>
            <div className="experience-links">
              <a className="experience-link" href="#work"><span className="experience-link__number">01</span><span><strong>Explore my work</strong><small>Projects and stories</small></span><Arrow diagonal /></a>
              <a className="experience-link" href="#lab"><span className="experience-link__number">02</span><span><strong>Enter the lab</strong><small>Experiments and ideas</small></span><Arrow diagonal /></a>
              <a className="experience-link experience-link--optional" href="#idea-engine"><span className="experience-link__number">03</span><span><strong>Play the Idea Engine</strong><small>A 60-second challenge <i>OPTIONAL</i></small></span><Arrow diagonal /></a>
              <a className="experience-link" href="#decision-room"><span className="experience-link__number">04</span><span><strong>Test my thinking</strong><small>The Decision Room</small></span><Arrow diagonal /></a>
            </div>
            <p className="experience-index__note">For a quick read: <a href="#work">projects</a>, <a href="#decision-room">how I think</a>, then <a href="#contact">say hello</a>.</p>
          </section>

          <section className="story section-shell chapter-section" id="story" data-chapter="story" aria-labelledby="story-title">
            <div className="section-label"><span>02</span><span>THE DIRECTION</span><span className="section-label__line" /></div>
            <div className="story__grid">
              <div>
                <p className="eyebrow">THE PERSON BEHIND THE WORK</p>
                <h2 id="story-title" className="section-title">Curiosity gives an idea <em>somewhere to go.</em></h2>
              </div>
              <div className="story__note">
                <p>This should feel like a personal story, not a timeline. The first turning point is still yours to tell.</p>
                <div className="draft-note"><span className="draft-note__mark">DRAFT / INPUT NEEDED</span><p>Add the moment that made building feel personal: what caught your attention, what you tried, and what changed your mind.</p></div>
                <a className="text-link" href="#contact">Help me shape this chapter <Arrow /></a>
              </div>
            </div>
          </section>

          <section className="work section-shell chapter-section" id="work" data-chapter="work" aria-labelledby="work-title">
            <div className="section-label"><span>03</span><span>THE CONNECTIONS</span><span className="section-label__line" /><span>SELECTED WORK / DETAILS TO VERIFY</span></div>
            <div className="work__intro">
              <div>
                <p className="eyebrow">THINGS I'VE TAKEN FROM IDEA TO REALITY</p>
                <h2 id="work-title" className="section-title">An idea becomes something <em>when you build.</em></h2>
              </div>
              <p className="work__lead">Open a case note to see the questions that matter: the problem, my ownership, the decisions, the process and what the evidence can actually support.</p>
            </div>

            <div className="project-list">
              {projects.map((project) => {
                const expanded = openProject === project.id;
                return (
                  <article className={`project-row ${expanded ? 'is-expanded' : ''}`} key={project.id} data-project-node={project.id}>
                    <button
                      className="project-row__trigger"
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`project-${project.id}-details`}
                      onClick={() => setOpenProject(expanded ? null : project.id)}
                      onPointerEnter={() => setActiveProject(project.id)}
                      onPointerLeave={() => setActiveProject((current) => current === project.id ? null : current)}
                      onFocus={() => setActiveProject(project.id)}
                      onBlur={(event) => {
                        if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) setActiveProject(null);
                      }}
                    >
                      <span className="project-row__number">{project.number}</span>
                      <span className="project-row__copy"><span className="project-row__category">{project.category}</span><strong>{project.title}</strong><small>{project.context}</small></span>
                      <span className={`project-row__plus ${expanded ? 'is-open' : ''}`} aria-hidden="true"><i /><i /></span>
                    </button>
                    {expanded && (
                      <div className="project-detail" id={`project-${project.id}-details`}>
                        <p className="project-detail__notice">CASE NOTES / PLACEHOLDERS TO REPLACE WITH VERIFIED DETAILS</p>
                        <div className="project-detail__fields">
                          {projectFields.map(([label, body]) => <div key={label}><span>{label}</span><p>{label === 'Problem' ? project.context : body}</p></div>)}
                        </div>
                        <div className="project-detail__footer"><span>ROLE, LINKS AND OUTCOMES ARE NOT YET VERIFIED</span><span>NO METRICS INVENTED</span></div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="work__endnote"><span className="signal-dot" /> Each story will distinguish what I did, what the team did, and what remains unfinished.</div>
          </section>

          <section className="lab section-shell chapter-section" id="lab" data-chapter="lab" aria-labelledby="lab-title">
            <div className="section-label"><span>04</span><span>THE EXPLORATION</span><span className="section-label__line" /><span>VOICE LAB / PROTOTYPE</span></div>
            <div className="lab__grid">
              <div className="lab__intro">
                <p className="eyebrow">A THOUGHT BEFORE IT IS POLISHED</p>
                <h2 id="lab-title" className="section-title">Not every path leads to <em>the answer.</em></h2>
                <p className="section-copy">Voice-versus-typing should be tested, not assumed. This small prototype lets you compare a typed thought with a pasted dictation transcript. The starter text is illustrative, not a Wispr Flow test or measured result; replace it with your own evidence before presenting it as one. No microphone is requested. Nothing is recorded or sent.</p>
                <span className="status-tag"><i /> PROTOTYPE / NOT A MEASURED EXPERIMENT</span>
              </div>

              <div className="voice-lab" aria-label="Voice Lab prototype">
                <div className="voice-lab__top"><span>LAB NOTE / 01</span><span>LOCAL ONLY</span></div>
                <div className="mode-switch" role="group" aria-label="Choose a capture method">
                  <button type="button" className={labMode === 'typed' ? 'is-selected' : ''} aria-pressed={labMode === 'typed'} onClick={() => { setLabMode('typed'); setBriefMode(null); }}>Typed thought</button>
                  <button type="button" className={labMode === 'dictated' ? 'is-selected' : ''} aria-pressed={labMode === 'dictated'} onClick={() => { setLabMode('dictated'); setBriefMode(null); }}>Pasted dictation</button>
                </div>
                <label className="field-label" htmlFor="thought-input">{labMode === 'typed' ? 'A thought, typed as it comes' : 'A transcript, pasted by you'}</label>
                <textarea
                  id="thought-input"
                  value={currentThought}
                  onChange={(event) => labMode === 'typed' ? setTypedThought(event.target.value) : setDictatedThought(event.target.value)}
                  rows={4}
                  maxLength={600}
                  placeholder="Write or paste a rough thought here…"
                />
                <div className="voice-lab__controls"><span>Not saved · no account · no microphone</span><button className="button button--small" type="button" onClick={shapeThought} disabled={!currentThought.trim()}>Shape the thought <Arrow /></button></div>
                {briefMode && (
                  <div className="structured-brief" aria-live="polite">
                    <div className="structured-brief__header"><span>THE FIRST SHAPE</span><span>{briefMode === 'typed' ? 'TYPED INPUT' : 'PASTED TRANSCRIPT'}</span></div>
                    <div><span>Intent</span><p>{currentThought.trim().split(/[.!?]/)[0] || 'A thought is taking shape.'}</p></div>
                    <div><span>Context</span><p>{briefMode === 'dictated' ? 'An example transcript pasted by the visitor. This page did not capture audio.' : 'An example thought typed by the visitor.'}</p></div>
                    <div><span>Next experiment</span><p>Choose one real workflow and define the smallest useful proof.</p></div>
                    <small>A simple on-device template, not AI output or a measured result.</small>
                  </div>
                )}
              </div>
            </div>

            <div className="idea-engine" id="idea-engine" aria-labelledby="idea-title">
              <div className="idea-engine__intro">
                <div><p className="eyebrow">OPTIONAL SIDE QUEST / 60 SECONDS</p><h3 id="idea-title">The Idea Engine</h3><p>Three small choices. One first experiment. Nothing is saved.</p></div>
                {!ideaRunning && !ideaComplete && <button className="button button--outline" type="button" onClick={beginIdeaEngine}>{ideaExpired ? 'Try another minute' : 'Start the challenge'} <Arrow /></button>}
              </div>
              {ideaRunning && (
                <div className="idea-round" aria-live="polite">
                  <div className="idea-round__meta"><span>STEP 0{ideaStep + 1} / 03</span><span className="idea-clock">00:{String(ideaSeconds).padStart(2, '0')}</span></div>
                  <progress max="60" value={60 - ideaSeconds} aria-label={`${60 - ideaSeconds} seconds elapsed in the optional challenge`} />
                  <p className="idea-round__prompt">{ideaRounds[ideaStep].prompt}</p>
                  <div className="choice-row">{ideaRounds[ideaStep].options.map((option) => <button data-analytics-id={`idea-engine-step-${ideaStep + 1}-option-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} type="button" key={option} onClick={() => answerIdea(option)}>{option}<Arrow /></button>)}</div>
                  <button className="text-button" type="button" onClick={() => setIdeaRunning(false)}>Pause and leave the challenge</button>
                </div>
              )}
              {ideaExpired && !ideaComplete && !ideaRunning && <div className="idea-result"><p>The minute is up. Your choices stay on this device until you leave; nothing was saved.</p><button className="text-link" type="button" onClick={beginIdeaEngine}>Start fresh <Arrow /></button></div>}
              {ideaComplete && (
                <div className="idea-result" aria-live="polite">
                  <p className="idea-result__title">A first experiment, in three moves.</p>
                  <ol>{ideaAnswers.map((answer, index) => <li key={`${answer}-${index}`}><span>0{index + 1}</span>{answer}</li>)}</ol>
                  <p>That is a starting point, not proof. The next useful step is to try it in a real workflow.</p>
                  <button className="text-link" type="button" onClick={beginIdeaEngine}>Play again <Arrow /></button>
                </div>
              )}
              {ideaExpired && <p className="idea-engine__privacy">Optional by design. Skip straight to the projects or Decision Room whenever you like.</p>}
            </div>
          </section>

          <section className="lessons section-shell chapter-section" id="lessons" data-chapter="lessons" aria-labelledby="lessons-title">
            <div className="section-label"><span>05</span><span>THE INTERRUPTION</span><span className="section-label__line" /></div>
            <div className="lessons__grid">
              <div><p className="eyebrow">THE HONEST BIT</p><h2 id="lessons-title" className="section-title">Sometimes the useful thing is finding out <em>what doesn't work.</em></h2></div>
              <div className="lessons__placeholder"><span className="draft-note__mark">REAL EXAMPLE NEEDED</span><p>A specific assumption, decision or technical approach belongs here. No invented “weakness” and no polished failure story.</p><a className="text-link" href="#contact">Add a lesson from the work <Arrow /></a></div>
            </div>
            <div className="research-note" id="exploring"><div><span className="eyebrow">WHAT I'M EXPLORING / DRAFT</span><h3>Accuracy is not the whole story.</h3></div><p>A research note in the source brief asks how predictive performance should be considered alongside power-system feasibility. Confirm whether this is still current and what can be shared.</p><span className="research-note__flag">STATUS TO CONFIRM</span></div>
          </section>

          <section className="wispr section-shell chapter-section" id="wispr" data-chapter="wispr" aria-labelledby="wispr-title">
            <div className="section-label"><span>06</span><span>THE CONVERGENCE</span><span className="section-label__line" /><span>SPECULATIVE GROWTH CONCEPT</span></div>
            <div className="wispr__heading"><div><p className="eyebrow">WHY I'D BE USEFUL AT WISPR FLOW</p><h2 id="wispr-title" className="section-title">India speaks. <em>Ideas move.</em></h2></div><p>A product-growth hypothesis to test—not an existing Wispr campaign, internal funnel fact or result.</p></div>
            <div className="wispr-evidence" aria-label="Evidence and questions behind the India growth hypothesis">
              <article className="wispr-evidence__item">
                <span>01 / THE PRODUCT JOB</span>
                <p>Wispr describes Flow as speech-to-text across apps and devices, with cleanup and personal vocabulary tools. The useful question is whether a person keeps the result in the work they were already doing—not whether a demo looks fast.</p>
                <a className="wispr-source" href="https://wisprflow.ai/features" target="_blank" rel="noreferrer">[1] Official product features <Arrow diagonal /></a>
                <a className="wispr-source" href="https://wisprflow.ai/pricing" target="_blank" rel="noreferrer">[2] Current plans <Arrow diagonal /></a>
              </article>
              <article className="wispr-evidence__item">
                <span>02 / THE INDIA SIGNAL</span>
                <p>IAMAI–Kantar reports 870 million internet users had accessed Indic-language content in 2024. Its voice-command measure includes activities such as navigation and search; neither statistic proves demand for AI dictation or Flow. This is a reason to test language and task fit, not a market-size claim.</p>
                <a className="wispr-source" href="https://www.iamai.in/sites/default/files/research/Kantar_%20IAMAI%20report_2024_.pdf" target="_blank" rel="noreferrer">[3] IAMAI–Kantar, ICUBE 2024 <Arrow diagonal /></a>
              </article>
              <article className="wispr-evidence__item">
                <span>03 / THE HUMAN FRICTION</span>
                <p>Individual reviews describe open-office awkwardness, proofreading and a learning curve. These are anecdotes, not representative findings. They suggest what to observe: comfort, correction effort and the moments when typing still wins.</p>
                <a className="wispr-source" href="https://nicklafferty.com/reviews/wispr-flow/" target="_blank" rel="noreferrer">[4] One user's 2026 review <Arrow diagonal /></a>
                <a className="wispr-source" href="https://zackproser.com/blog/wisprflow-review" target="_blank" rel="noreferrer">[5] One high-use review <Arrow diagonal /></a>
              </article>
            </div>
            <div className="wispr-concept">
              <div className="wispr-concept__statement">
                <span className="concept-index">MY HIRING CASE / DATA + PRODUCT</span>
                <h3>Growth is the moment a first draft becomes a habit.</h3>
                <p>As a data scientist with AI/ML experience and a product-thinking mindset, I would connect model behavior to the work a person actually finishes: find the failure slice, measure the correction cost, prototype one change, then see if users keep the output and return. That is the contribution I would bring—not a claim that I have already run a Wispr campaign.</p>
                <div className="wispr-cohort"><span>FIRST COHORT / HYPOTHESIS</span><p>Bengaluru campus creators who regularly draft short scripts or captions on a phone or laptop. A bounded group with a concrete artifact to test—not a claim that this is India's best or largest audience. Validate their language, device, setting and comfort before deciding.</p></div>
              </div>
              <div className="wispr-concept__measurement"><span className="eyebrow">WHAT WOULD COUNT AS VALUE?</span><ul><li>A draft the user keeps</li><li>Less correction work</li><li>Useful output quality</li><li>Voluntary repeat use</li></ul><p>Proposed measures only. No baseline, conversion rate or campaign outcome is claimed.</p></div>
            </div>

            <div className="decision-room" id="decision-room" aria-labelledby="decision-title">
              <div className="decision-room__heading"><div><p className="eyebrow">TEST MY THINKING / DECISION ROOM</p><h3 id="decision-title">Where does intent become habit?</h3></div><p>Scenario: a voice demo attracts interest, but the team still needs to learn who reaches a useful first draft, who returns and why. This is a proposed diagnostic—not a claim about Wispr Flow's actual funnel.</p></div>
              <div className="decision-room__body">
                <div className="decision-options" role="group" aria-label="Choose an adoption stage to inspect">
                  {decisionOptions.map((option, index) => <button data-analytics-id={`wispr-growth-stage-${option.id}`} className={decisionChoice === option.id ? 'is-selected' : ''} type="button" aria-pressed={decisionChoice === option.id} key={option.id} onClick={() => setDecisionChoice(option.id)}><span>0{index + 1}</span><strong>{option.title}</strong><small>{option.lens}</small><Arrow diagonal /></button>)}
                </div>
                <div className="decision-detail" aria-live="polite">
                  <div className="decision-detail__top"><span>USER JOURNEY / PROPOSED</span><span>NO RESULTS CLAIMED</span></div>
                  <p className="decision-detail__experiment">{selectedDecision.experiment}</p>
                  <div className="decision-detail__row"><span>Signal to watch</span><p>{selectedDecision.signal}</p></div>
                  <div className="decision-detail__row"><span>What I'd do next</span><p>{selectedDecision.next}</p></div>
                  <div className="decision-detail__row"><span>Guardrail</span><p>{selectedDecision.guardrail}</p></div>
                  <button className="text-link" type="button" onClick={copyDecision}>{copied ? 'Copied to clipboard' : 'Copy this decision note'} <Arrow /></button>
                </div>
              </div>
            </div>
          </section>

          <section className="contact section-shell chapter-section" id="contact" data-chapter="contact" aria-labelledby="contact-title">
            <div className="section-label"><span>07</span><span>THE LOOP</span><span className="section-label__line" /></div>
            <div className="contact__content">
              <p className="eyebrow">ONE IDEA SHIPPED. ANOTHER BEGINS.</p>
              <h2 id="contact-title" className="section-title">Don't just read what I can do.<br /><em>Let's build something.</em></h2>
              <p className="contact__copy">I'm interested in work where I can think, experiment, build, measure and own the outcome.</p>
              <div className="contact__links">
                <a href="https://github.com/Omikar243" target="_blank" rel="noreferrer">GitHub <Arrow diagonal /><small>Omikar243</small></a>
                <div className="contact-placeholder"><span>LinkedIn</span><small>Profile URL to add</small></div>
                <div className="contact-placeholder"><span>Email</span><small>Address to add</small></div>
              </div>
              <a
                className="button cv-download"
                href="/api/download/profile"
                download="Omkar_Shettigar_Profile.pdf"
                data-analytics-id="download-full-cv"
                onClick={(event) => {
                  if (!analyticsEnabledForCurrentDevice()) {
                    event.preventDefault();
                    window.location.assign('/api/download/profile?analytics=off');
                  }
                }}
              >
                Download full CV <Arrow diagonal />
              </a>
            </div>
            <footer className="site-footer">
              <span>VOICE TO SHIP / OMKAR SHETTIGAR</span>
              <span>BUILT A LITTLE AT A TIME · BENGALURU, IN</span>
              <div className="site-footer__actions">
                <button type="button" onClick={openAnalyticsSettings}>Analytics settings</button>
                <a href="#hero">Back to the signal <Arrow /></a>
              </div>
            </footer>
          </section>
        </main>
        <AnalyticsClient />
      </div>
    </LenisRoot>
  );
}

export default App;
