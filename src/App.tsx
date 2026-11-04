import { lazy, Suspense, useEffect, useState } from 'react';
import { Atmosphere } from './components/Atmosphere';
import { BlurText } from './components/BlurText';
import { EvolvingSignal } from './components/EvolvingSignal';
import { LenisRoot } from './components/LenisRoot';
import { AnalyticsClient } from './components/AnalyticsClient';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { GeminiLiveVoiceAgent } from './components/GeminiLiveVoiceAgent';
import { VoiceAgent } from './components/VoiceAgent';

const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard').then(({ AnalyticsDashboard: component }) => ({ default: component })));
const SignalLostGame = lazy(() => import('./components/SignalLostGame').then(({ SignalLostGame: component }) => ({ default: component })));

type Chapter = { id: string; label: string; short: string };
type Locale = 'en' | 'hi' | 'mr' | 'kn' | 'ta';

const localeOptions: { id: Locale; label: string; nativeLabel: string }[] = [
  { id: 'en', label: 'English', nativeLabel: 'EN' },
  { id: 'hi', label: 'हिन्दी', nativeLabel: 'हिं' },
  { id: 'mr', label: 'मराठी', nativeLabel: 'मर' },
  { id: 'kn', label: 'ಕನ್ನಡ', nativeLabel: 'ಕನ್ನಡ' },
  { id: 'ta', label: 'தமிழ்', nativeLabel: 'தமிழ்' },
];

const uiCopy: Record<Locale, {
  chapters: string[];
  heroEyebrow: string;
  heroIntro: string;
  heroSubline: string;
  showWork: string;
  showThinking: string;
  showLearning: string;
  chooseTitle: string;
  chooseNote: string;
  storyEyebrow: string;
  storyTitle: string;
  workEyebrow: string;
  workTitle: string;
  workLead: string;
  contactEyebrow: string;
  contactTitle: string;
  contactCopy: string;
  language: string;
}> = {
  en: { chapters: ['The Signal', 'The Direction', 'The Connections', 'The Exploration', 'The Interruption', 'The Convergence', 'The Loop'], heroEyebrow: 'AN INTERACTIVE DOCUMENTARY / A BUILDER IN MUMBAI', heroIntro: 'Data Scientist & AI/ML Engineer with two years of experience building production-grade LLM systems, agentic AI and retrieval pipelines.', heroSubline: 'A journey through ideas, experiments, mistakes and things shipped.', showWork: "Show me what I've built", showThinking: 'Show me how I think', showLearning: "Show me what I've learned", chooseTitle: 'Choose your experience.', chooseNote: 'For a quick read: projects, how I think, then say hello.', storyEyebrow: 'THE PERSON BEHIND THE WORK', storyTitle: 'Curiosity gives an idea somewhere to go.', workEyebrow: "THINGS I'VE TAKEN FROM IDEA TO REALITY", workTitle: 'An idea becomes something when you build.', workLead: 'Open a case note to see the problem, ownership, decisions, process and evidence.', contactEyebrow: 'ONE IDEA SHIPPED. ANOTHER BEGINS.', contactTitle: "Don't just read what I can do. Let's build something.", contactCopy: "I'm interested in work where I can think, experiment, build, measure and own the outcome.", language: 'Language' },
  hi: { chapters: ['संकेत', 'दिशा', 'संबंध', 'खोज', 'विराम', 'मेल', 'चक्र'], heroEyebrow: 'एक इंटरैक्टिव डॉक्यूमेंट्री / मुंबई का बिल्डर', heroIntro: 'डेटा साइंटिस्ट और AI/ML इंजीनियर, जो प्रोडक्शन LLM सिस्टम, एजेंटिक AI और retrieval pipelines बनाते हैं।', heroSubline: 'विचारों, प्रयोगों, गलतियों और शिप किए गए काम की यात्रा।', showWork: 'मैंने क्या बनाया देखें', showThinking: 'मैं कैसे सोचता हूँ देखें', showLearning: 'मैंने क्या सीखा देखें', chooseTitle: 'अपना अनुभव चुनें।', chooseNote: 'जल्दी पढ़ने के लिए: प्रोजेक्ट्स, सोचने का तरीका, फिर संपर्क करें।', storyEyebrow: 'काम के पीछे का व्यक्ति', storyTitle: 'जिज्ञासा किसी विचार को दिशा देती है।', workEyebrow: 'विचार से वास्तविकता तक', workTitle: 'बनाने पर ही विचार कुछ बनता है।', workLead: 'समस्या, स्वामित्व, निर्णय और प्रमाण देखने के लिए केस नोट खोलें।', contactEyebrow: 'एक विचार शिप हुआ। दूसरा शुरू होता है।', contactTitle: 'सिर्फ पढ़ें नहीं कि मैं क्या कर सकता हूँ। साथ मिलकर बनाते हैं।', contactCopy: 'मुझे ऐसे काम में रुचि है जहाँ मैं सोचूँ, प्रयोग करूँ, बनाऊँ, मापूँ और परिणाम की जिम्मेदारी लूँ।', language: 'भाषा' },
  mr: { chapters: ['संकेत', 'दिशा', 'संबंध', 'शोध', 'विराम', 'संगम', 'फेरा'], heroEyebrow: 'एक संवादात्मक डॉक्युमेंटरी / मुंबईतील बिल्डर', heroIntro: 'डेटा सायंटिस्ट आणि AI/ML इंजिनिअर; प्रोडक्शन LLM सिस्टम्स, एजेंटिक AI आणि retrieval pipelines तयार करण्याचा अनुभव.', heroSubline: 'कल्पना, प्रयोग, चुका आणि प्रत्यक्षात आणलेल्या कामांचा प्रवास.', showWork: 'मी काय बनवले ते पहा', showThinking: 'मी कसा विचार करतो ते पहा', showLearning: 'मी काय शिकलो ते पहा', chooseTitle: 'तुमचा अनुभव निवडा.', chooseNote: 'थोडक्यात: प्रोजेक्ट्स, विचार करण्याची पद्धत, मग संपर्क करा.', storyEyebrow: 'कामामागील व्यक्ती', storyTitle: 'कुतूहलाला कल्पनेला दिशा देऊ द्या.', workEyebrow: 'कल्पनेपासून प्रत्यक्ष कामापर्यंत', workTitle: 'बनवल्यावरच कल्पना आकार घेते.', workLead: 'समस्या, जबाबदारी, निर्णय आणि पुरावे पाहण्यासाठी केस नोट उघडा.', contactEyebrow: 'एक कल्पना शिप झाली. दुसरी सुरू होते.', contactTitle: 'मी काय करू शकतो हे फक्त वाचू नका. चला, काहीतरी बनवूया.', contactCopy: 'जिथे विचार, प्रयोग, बांधणी, मोजमाप आणि परिणामाची जबाबदारी घेता येते अशा कामात मला रस आहे.', language: 'भाषा' },
  kn: { chapters: ['ಸಂಕೇತ', 'ದಿಕ್ಕು', 'ಸಂಪರ್ಕಗಳು', 'ಅನ್ವೇಷಣೆ', 'ವಿರಾಮ', 'ಸಂಗಮ', 'ಚಕ್ರ'], heroEyebrow: 'ಒಂದು ಸಂವಾದಾತ್ಮಕ ಡಾಕ್ಯುಮೆಂಟರಿ / ಮುಂಬೈನ ಬಿಲ್ಡರ್', heroIntro: 'ಪ್ರೊಡಕ್ಷನ್ LLM ಸಿಸ್ಟಮ್‌ಗಳು, ಏಜೆಂಟಿಕ್ AI ಮತ್ತು retrieval pipelines ನಿರ್ಮಿಸುವ ಡೇಟಾ ಸೈಂಟಿಸ್ಟ್ ಮತ್ತು AI/ML ಎಂಜಿನಿಯರ್.', heroSubline: 'ಆಲೋಚನೆಗಳು, ಪ್ರಯೋಗಗಳು, ತಪ್ಪುಗಳು ಮತ್ತು ಶಿಪ್ ಮಾಡಿದ ಕೆಲಸದ ಪ್ರಯಾಣ.', showWork: 'ನಾನು ನಿರ್ಮಿಸಿದುದನ್ನು ನೋಡಿ', showThinking: 'ನಾನು ಹೇಗೆ ಯೋಚಿಸುತ್ತೇನೆ ನೋಡಿ', showLearning: 'ನಾನು ಕಲಿತುದನ್ನು ನೋಡಿ', chooseTitle: 'ನಿಮ್ಮ ಅನುಭವ ಆಯ್ಕೆಮಾಡಿ.', chooseNote: 'ತ್ವರಿತ ಓದಿಗೆ: ಪ್ರಾಜೆಕ್ಟ್‌ಗಳು, ನನ್ನ ಚಿಂತನೆ, ನಂತರ ಸಂಪರ್ಕಿಸಿ.', storyEyebrow: 'ಕೆಲಸದ ಹಿಂದಿರುವ ವ್ಯಕ್ತಿ', storyTitle: 'ಕುತೂಹಲವು ಆಲೋಚನೆಗೆ ದಾರಿ ನೀಡುತ್ತದೆ.', workEyebrow: 'ಆಲೋಚನೆಯಿಂದ ವಾಸ್ತವಕ್ಕೆ', workTitle: 'ನಿರ್ಮಿಸಿದಾಗಲೇ ಆಲೋಚನೆ ರೂಪ ಪಡೆಯುತ್ತದೆ.', workLead: 'ಸಮಸ್ಯೆ, ಹೊಣೆಗಾರಿಕೆ, ನಿರ್ಧಾರ ಮತ್ತು ಸಾಕ್ಷ್ಯ ನೋಡಲು ಕೇಸ್ ನೋಟ್ ತೆರೆಯಿರಿ.', contactEyebrow: 'ಒಂದು ಆಲೋಚನೆ ಶಿಪ್ ಆಯಿತು. ಇನ್ನೊಂದು ಆರಂಭವಾಗುತ್ತದೆ.', contactTitle: 'ನಾನು ಏನು ಮಾಡಬಲ್ಲೆ ಎಂದು ಓದುವುದಷ್ಟೇ ಬೇಡ. ಒಟ್ಟಿಗೆ ನಿರ್ಮಿಸೋಣ.', contactCopy: 'ಯೋಚಿಸಲು, ಪ್ರಯೋಗಿಸಲು, ನಿರ್ಮಿಸಲು, ಅಳೆಯಲು ಮತ್ತು ಫಲಿತಾಂಶದ ಹೊಣೆ ಹೊರುವ ಕೆಲಸದಲ್ಲಿ ನನಗೆ ಆಸಕ್ತಿ.', language: 'ಭಾಷೆ' },
  ta: { chapters: ['சிக்னல்', 'திசை', 'இணைப்புகள்', 'ஆராய்ச்சி', 'இடைவேளை', 'சங்கமம்', 'சுழற்சி'], heroEyebrow: 'ஒரு ஊடாடும் ஆவணம் / மும்பையின் உருவாக்குநர்', heroIntro: 'Production LLM அமைப்புகள், agentic AI மற்றும் retrieval pipelines உருவாக்கும் Data Scientist & AI/ML Engineer.', heroSubline: 'யோசனைகள், பரிசோதனைகள், தவறுகள் மற்றும் வெளியிட்ட பணிகளின் பயணம்.', showWork: 'நான் உருவாக்கியதைப் பாருங்கள்', showThinking: 'நான் எப்படி சிந்திக்கிறேன் பாருங்கள்', showLearning: 'நான் கற்றதைப் பாருங்கள்', chooseTitle: 'உங்கள் அனுபவத்தைத் தேர்ந்தெடுக்கவும்.', chooseNote: 'விரைவாகப் படிக்க: திட்டங்கள், என் சிந்தனை, பின்னர் தொடர்பு கொள்ளுங்கள்.', storyEyebrow: 'பணிக்குப் பின்னால் இருக்கும் நபர்', storyTitle: 'ஆர்வம் ஒரு யோசனைக்கு செல்லும் வழியைத் தருகிறது.', workEyebrow: 'யோசனையிலிருந்து நிஜத்திற்கு', workTitle: 'உருவாக்கும்போதுதான் யோசனை வடிவம் பெறுகிறது.', workLead: 'சிக்கல், உரிமை, முடிவுகள் மற்றும் ஆதாரங்களைப் பார்க்க கேஸ் நோட்டைத் திறக்கவும்.', contactEyebrow: 'ஒரு யோசனை வெளியானது. இன்னொன்று தொடங்குகிறது.', contactTitle: 'நான் என்ன செய்ய முடியும் என்று மட்டும் படிக்க வேண்டாம். ஒன்றாக உருவாக்குவோம்.', contactCopy: 'சிந்திக்கவும், பரிசோதிக்கவும், உருவாக்கவும், அளக்கவும், முடிவுக்குப் பொறுப்பேற்கவும் கூடிய பணிகளில் எனக்கு ஆர்வம்.', language: 'மொழி' },
};

type Project = {
  id: string;
  number: string;
  title: string;
  category: string;
  context: string;
  details: string[];
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
    context: 'A CISC-2024 computer-vision project pairing X-ray classification with retrieval-augmented clinical context.',
    details: ['Problem · Classify radiographic knee osteoarthritis while keeping clinical recommendations grounded in peer-reviewed literature.', 'Ownership · Built the Compact Vision Net, domain-specific PEFT/LoRA fine-tuning and preprocessing with CLAHE, gamma correction and Gaussian smoothing.', 'Technical approach · Combined a 13-class CNN classifier with a LLaMA-3 RAG assistant using LangChain and Groq.', 'Results · Resume-reported 90% classification accuracy across 13 pathology classes and 97 ms inference after preprocessing; presented at CISC-2024.', 'Scope · The public portfolio summarizes the reported result; dataset splits and the full evaluation protocol are not included here.'],
  },
  {
    id: 'ancient-modern-apparel',
    number: '02',
    title: 'Ancient Modern Apparel — fashion platform',
    category: 'Full-stack product / generative 3D',
    context: 'A shipped product connecting AI-assisted avatar generation, garment previews and a personalized catalog flow.',
    details: ['Problem · Help people explore garments through AI-assisted avatars, 3D previews and a personalized catalog workflow.', 'Ownership · Built the full-stack product across the Next.js 15, React 19, TypeScript and Tailwind frontend and Python FastAPI backend.', 'Technical approach · Added four-view avatar synthesis, real-time Three.js / React Three Fiber garment rendering, REST APIs and Drizzle ORM with Turso.', 'Results · Shipped authentication, session management, catalog and cart workflows, Supabase asset storage and Vercel CI/CD deployment.', 'Scope · The resume confirms the stack and shipped surfaces; contribution boundaries for each product area are not expanded further.'],
  },
  {
    id: 'catalysk-ai-systems',
    number: '03',
    title: 'Production AI systems in sustainable finance',
    category: 'Data science / retrieval / evaluation',
    context: 'A production systems chapter spanning semantic retrieval, agentic classification and high-throughput feature pipelines.',
    details: ['Problem · Make financial-intelligence classification faster, safer to change and more useful for analyst review.', 'Ownership · Built progressive routing, composable skill modules, hybrid RAG retrieval, counterparty guardrails and evaluation harnesses in a sustainable-finance production environment.', 'Technical approach · Combined deterministic rules, Sentence-BERT, FAISS, Ollama / LLaMA / Gemma, structured JSON contracts, LRU caching and async Python pipelines.', 'Results · Resume-reported 94% runtime reduction from 2,160s to 125s across 300,000+ records, 6.8× classification-latency speedup, and retrieval across 17,500+ entities.', 'Scope · Also built a 4,535-sample bit-for-bit parity harness and CI/CD validation gates; employer and client details are intentionally omitted.'],
  },
];

const projectFields = [
  ['Problem', 'What needed to become more useful, reliable or fast?'],
  ['Ownership', 'What Omkar owned in the build or investigation.'],
  ['Technical approach', 'The models, systems and trade-offs behind the work.'],
  ['Results', 'Resume-reported outcomes, with units and limits.'],
  ['Scope', 'What is confirmed, and what is intentionally not claimed.'],
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
    experiment: 'First-cohort hypothesis: Indian campus creators who regularly draft short scripts or captions. Show a consented, task-led example, then invite a real first try instead of optimizing for views.',
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
  const [gameOpen, setGameOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = window.localStorage.getItem('voice-to-ship-locale') as Locale | null;
    return saved && localeOptions.some((option) => option.id === saved) ? saved : 'en';
  });
  const copy = uiCopy[locale];

  useEffect(() => {
    window.localStorage.setItem('voice-to-ship-locale', locale);
    document.documentElement.lang = locale === 'en' ? 'en' : locale;
  }, [locale]);

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

  if (window.location.pathname === '/insights') return <Suspense fallback={<main className="insights-shell"><p className="insights-loading">Loading insights…</p></main>}><AnalyticsDashboard /></Suspense>;

  return (
    <LenisRoot>
      <div className="site-shell">
        <button className="game-launcher" type="button" data-analytics-id="signal-lost-launcher" onClick={() => setGameOpen(true)}><span>PLAY A GAME</span><strong>Signal Lost ↗</strong></button>
        {gameOpen && <Suspense fallback={null}><SignalLostGame onExit={() => setGameOpen(false)} /></Suspense>}
        {import.meta.env.VITE_VOICE_SERVICE_URL ? <GeminiLiveVoiceAgent onPlayGame={() => setGameOpen(true)} /> : <VoiceAgent onPlayGame={() => setGameOpen(true)} />}
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
          <div className="header-meta"><span>OMKAR SHETTIGAR</span><span className="header-meta__dot" /><span>MUMBAI, IN</span></div>
          <div className="header-actions">
            <label className="language-selector"><span>{copy.language}</span><select aria-label={copy.language} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>{localeOptions.map((option) => <option value={option.id} key={option.id}>{option.nativeLabel} · {option.label}</option>)}</select></label>
            <a className="header-shortcut" href="#work">{copy.showWork} <Arrow diagonal /></a>
            <button className="chapter-toggle" type="button" aria-expanded={menuOpen} aria-controls="chapter-menu" onClick={() => setMenuOpen((open) => !open)}>
              <span>{menuOpen ? 'Close' : 'Chapters'}</span><span className={`menu-glyph ${menuOpen ? 'is-open' : ''}`} aria-hidden="true"><i /><i /></span>
            </button>
          </div>
          {menuOpen && (
            <nav className="chapter-menu" id="chapter-menu" aria-label="Chapter navigation">
              <p className="eyebrow">{copy.heroEyebrow.split(' / ')[0]}</p>
              {chapters.map((chapter) => (
                <a key={chapter.id} href={`#${chapter.id}`} className={activeChapter === chapter.id ? 'is-current' : ''} onClick={() => setMenuOpen(false)}>
                  <span>{chapter.short}</span>{copy.chapters[Number(chapter.short) - 1]}<Arrow diagonal />
                </a>
              ))}
            </nav>
          )}
        </header>

        <main id="main-content">
          <section className="hero section-shell" id="hero" data-chapter="hero">
            <Atmosphere />
            <div className="hero__copy">
              <p className="eyebrow hero__eyebrow"><span className="eyebrow-dot" /> {copy.heroEyebrow.replace(' / ', ' ')} </p>
              <h1 aria-label="I build things to understand how they work.">
                <span className="hero-title__line"><BlurText text="I build things" delay={0.035} /></span>
                <span className="hero-title__line"><BlurText text="to understand" delay={0.06} /></span>
                <span className="hero-title__line hero-title__last"><BlurText text="how they" delay={0.08} /> <em><BlurText text="work." delay={0.1} /></em></span>
              </h1>
              <p className="hero__intro">{copy.heroIntro}</p>
              <p className="hero__subline">{copy.heroSubline}</p>
              <button className="game-invite" type="button" data-analytics-id="signal-lost-hero-invite" onClick={() => setGameOpen(true)}><span>INTERACTIVE EXPERIENCE / AVAILABLE</span><strong>Signal <em>Lost.</em></strong><small>Can you turn chaos into something real? · 8 levels · no login</small><Arrow diagonal /></button>
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
                <a href="#work">{copy.showWork} <Arrow /></a>
                <a href="#decision-room">{copy.showThinking} <Arrow /></a>
                <a href="#lessons">{copy.showLearning} <Arrow /></a>
              </div>
            </div>
          </section>

          <section className="experience-index section-shell" aria-labelledby="choose-title">
            <div className="section-kicker"><span>START ANYWHERE</span><span>NO GATE. NO FORM. NO AUDIO.</span></div>
            <h2 id="choose-title" className="experience-index__title">{copy.chooseTitle}</h2>
            <div className="experience-links">
              <a className="experience-link" href="#work"><span className="experience-link__number">01</span><span><strong>Explore my work</strong><small>Projects and stories</small></span><Arrow diagonal /></a>
              <a className="experience-link" href="#lab"><span className="experience-link__number">02</span><span><strong>Enter the lab</strong><small>Experiments and ideas</small></span><Arrow diagonal /></a>
              <a className="experience-link experience-link--optional" href="#idea-engine"><span className="experience-link__number">03</span><span><strong>Play the Idea Engine</strong><small>A 60-second challenge <i>OPTIONAL</i></small></span><Arrow diagonal /></a>
              <a className="experience-link" href="#decision-room"><span className="experience-link__number">04</span><span><strong>Test my thinking</strong><small>The Decision Room</small></span><Arrow diagonal /></a>
            </div>
            <p className="experience-index__note">{copy.chooseNote}</p>
          </section>

          <section className="story section-shell chapter-section" id="story" data-chapter="story" aria-labelledby="story-title">
            <div className="section-label"><span>02</span><span>THE DIRECTION</span><span className="section-label__line" /></div>
            <div className="story__grid">
              <div>
                <p className="eyebrow">{copy.storyEyebrow}</p>
                <h2 id="story-title" className="section-title">{copy.storyTitle}</h2>
              </div>
              <div className="story__note">
                <p>I started with the visible part of machine learning: making a prediction. Working on production financial-intelligence systems changed the question. When a pipeline regresses, a score alone does not explain what changed, how much correction it creates, or whether an analyst can trust the result.</p>
                <p>That is why my work now moves between agentic routing, Sentence-BERT and FAISS retrieval, high-throughput Python pipelines, and evaluation harnesses that make prediction drift visible. The same instinct appears in my CISC-2024 clinical RAG project and in Ancient Modern Apparel: connect the model to a usable system, measure the failure path, and ship the smallest proof.</p>
                <div className="draft-note"><span className="draft-note__mark">EDUCATION / EARLY EXPERIENCE</span><p>B.E. in Artificial Intelligence and Data Science from Visvesvaraya Technological University, Jan 2021–Jan 2025 · GPA 8.44 / 10.0. Earlier, at SM Khannukar Associates, I built an LSTM/RNN stock-forecasting pipeline and a 30-day backtest reported at 85% directional accuracy.</p></div>
                <a className="text-link" href="#work">See the resume-grounded work <Arrow /></a>
              </div>
            </div>
          </section>

          <section className="work section-shell chapter-section" id="work" data-chapter="work" aria-labelledby="work-title">
            <div className="section-label"><span>03</span><span>THE CONNECTIONS</span><span className="section-label__line" /><span>SELECTED WORK / DETAILS TO VERIFY</span></div>
            <div className="work__intro">
              <div>
                <p className="eyebrow">{copy.workEyebrow}</p>
                <h2 id="work-title" className="section-title">{copy.workTitle}</h2>
              </div>
              <p className="work__lead">{copy.workLead}</p>
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
                        <p className="project-detail__notice">CASE NOTES / RESUME-GROUNDED SUMMARY</p>
                        <div className="project-detail__fields">
                          {projectFields.map(([label, body], index) => <div key={label}><span>{label}</span><p>{project.details[index] ?? (label === 'Problem' ? project.context : body)}</p></div>)}
                        </div>
                        <div className="project-detail__footer"><span>SELECTED FROM CURRENT RESUME</span><span>LIMITS STATED WHERE NEEDED</span></div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="work__endnote"><span className="signal-dot" /> Selected work is grounded in the attached resume; employer-sensitive implementation details remain intentionally high-level.</div>
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
              {ideaExpired && <p className="idea-engine__optional">Optional by design. Skip straight to the projects or Decision Room whenever you like.</p>}
            </div>
          </section>

          <section className="lessons section-shell chapter-section" id="lessons" data-chapter="lessons" aria-labelledby="lessons-title">
            <div className="section-label"><span>05</span><span>THE INTERRUPTION</span><span className="section-label__line" /></div>
            <div className="lessons__grid">
              <div><p className="eyebrow">THE HONEST BIT</p><h2 id="lessons-title" className="section-title">Sometimes the useful thing is finding out <em>what doesn't work.</em></h2></div>
              <div className="lessons__placeholder"><span className="draft-note__mark">LESSON FROM PRODUCTION</span><p>When an architectural change introduced prediction mismatches, I did not treat the model score as enough evidence. I built a 4,535-sample bit-for-bit golden parity and decision-trace harness, then paired it with CI/CD and pre-release validation gates so regressions became visible before release.</p><a className="text-link" href="#work">Read the systems chapter <Arrow /></a></div>
            </div>
            <div className="research-note" id="exploring"><div><span className="eyebrow">TOOLS I WORK WITH</span><h3>Systems, not just models.</h3></div><p>Python, SQL, TypeScript, FastAPI, LangGraph, LangChain, MCP, RAG, Sentence-BERT, FAISS, Ollama, LLaMA, Gemma, PyTorch, scikit-learn, XGBoost, MLflow, Docker, AWS, GCP, Azure, PostgreSQL, MySQL, Supabase, Turso and Vercel.</p><span className="research-note__flag">RESUME / SELECTED STACK</span></div>
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
                <div className="wispr-cohort"><span>FIRST COHORT / HYPOTHESIS</span><p>Indian campus creators who regularly draft short scripts or captions on a phone or laptop. A bounded group with a concrete artifact to test—not a claim that this is India's best or largest audience. Validate language, device, setting and comfort before deciding.</p></div>
                <div className="wispr-skills"><span>WHAT I BRING / RESUME-GROUNDED</span><ul><li><strong>Agentic AI + routing</strong><small>Rules → retrieval → structured LLM fallback, with confidence-aware escalation.</small></li><li><strong>RAG + retrieval systems</strong><small>Sentence-BERT, FAISS, vector indexing and semantic search built for real workloads.</small></li><li><strong>Evaluation discipline</strong><small>Golden parity, decision traces, CI/CD gates, drift checks and confidence calibration.</small></li><li><strong>Performance ownership</strong><small>Async Python, batching, LRU caching and profiling across 300,000+ records.</small></li><li><strong>Product-minded experimentation</strong><small>Turn model behavior into a kept draft, lower correction cost and repeat value.</small></li><li><strong>Production delivery</strong><small>FastAPI, Docker, AWS, MLflow, A/B testing and observable service contracts.</small></li></ul></div>
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
              <p className="eyebrow">{copy.contactEyebrow}</p>
              <h2 id="contact-title" className="section-title">{copy.contactTitle}</h2>
              <p className="contact__copy">{copy.contactCopy}</p>
              <div className="contact__links">
                <a href="https://github.com/Omikar243" target="_blank" rel="noreferrer">GitHub <Arrow diagonal /><small>Omikar243</small></a>
                <a href="https://www.linkedin.com/in/omkar-shettigar-43035737a/" target="_blank" rel="noreferrer">LinkedIn <Arrow diagonal /><small>omkar-shettigar</small></a>
                <a href="mailto:omikar243@gmail.com">Email <Arrow diagonal /><small>omikar243@gmail.com</small></a>
              </div>
              <a
                className="button cv-download"
                href="/api/download/profile"
                download="Omkar_Shettigar_Profile.pdf"
                data-analytics-id="download-full-cv"
              >
                Download full CV <Arrow diagonal />
              </a>
            </div>
            <footer className="site-footer">
              <span>VOICE TO SHIP / OMKAR SHETTIGAR</span>
              <span>BUILT A LITTLE AT A TIME · MUMBAI, IN</span>
              <div className="site-footer__actions">
                <a href="#hero">Back to the signal <Arrow /></a>
              </div>
            </footer>
          </section>
        </main>
        <AnalyticsClient />
        <PerformanceMonitor />
      </div>
    </LenisRoot>
  );
}

export default App;
