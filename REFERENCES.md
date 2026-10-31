# Implementation references

- **Lenis** — https://lenis.dev/ and https://github.com/darkroomengineering/lenis/blob/main/README.md. The official site presents Lenis as a lightweight smooth-scroll library, designed to preserve normal scrolling behavior and accessibility. This project uses it only when the visitor has not requested reduced motion.
- **React Bits tools** — https://reactbits.dev/tools. The supplied tools include Background Studio and Texture Lab for tuning/exporting motion and texture treatments. The site instead uses a small CSS grain layer and a custom SVG so its visual system stays light and tied to the content.
- **React Bits Blur Text** — https://reactbits.dev/text-animations/blur-text and https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/TextAnimations/BlurText/BlurText.tsx. The project adapts the word-by-word blur-to-focus reveal pattern using Motion, with one accessible full-text label and reduced-motion support.
- **Vanta.js** — https://www.vantajs.com/. The official page notes that WebGL effects can be slow on older computers, recommends a background fallback on mobile, and cautions against stacking too many effects. Vanta Fog is therefore isolated to the hero and initialized only on wider screens when reduced motion is off; the CSS background remains the fallback.
- **Spline backgrounds** — https://community.spline.design/tag/Background. Used only as a visual reference for restrained ambience; no Spline scene is embedded.

The portfolio's recurring line is a native SVG. It is not rendered in 3D. Its accent color, warm orange `#FF8A42`, comes from the supplied portfolio direction.

## Wispr Flow product and growth research

Sources reviewed on 2026-11-01. These inform a speculative product-growth analysis, not claims about Wispr's internal metrics or market performance.

- **[1] Wispr Flow features** — https://wisprflow.ai/features. The company describes speech-to-text across apps and Mac, Windows, iPhone, and Android, plus cleanup, personal dictionaries, snippets, and writing styles. These are product-positioning statements, not independently verified outcome measurements.
- **[2] Wispr Flow pricing** — https://wisprflow.ai/pricing. The current page lists a free tier across its supported platforms. Pricing and plan details are dynamic; the portfolio should link to the page rather than hard-code plan limits or conversion claims.
- **[3] IAMAI–Kantar, Internet in India 2024** — https://www.iamai.in/sites/default/files/research/Kantar_%20IAMAI%20report_2024_.pdf. The ICUBE report estimates 870 million Indian internet users had accessed Indic-language internet content in 2024 and says 57% of urban internet users mentioned preferring Indic-language content. It reports 140 million (15%) users of voice-based internet commands; examples include navigation, shopping lists, news and information search. This is not evidence of demand for AI dictation, Wispr Flow adoption, or a viable market size. The report's own headline describes the voice-command share as “every 1 in 5”, while the displayed 140/886 million figures are about 15%; do not combine these as a precise rate.
- **[4] Nick Lafferty, “Wispr Flow Review: Is Voice Dictation Worth It in 2026?”** — https://nicklafferty.com/reviews/wispr-flow/. Published 2026-08-10; the author discloses affiliate links. This individual account describes open-office discomfort, continued proofreading/editing, task-fit limits, and habit formation. Treat these as prompts for user research, not representative findings.
- **[5] Zack Proser, “Wispr Flow Review (2026): My Honest Daily-Use Test”** — https://zackproser.com/blog/wisprflow-review. Individual high-use review with affiliate links. The author discusses occasional retries, long-dictation chunking, learning voice commands, editing, and cross-app workflows. This is a single user's account, not population-level product evidence.

Portfolio experiment rule: use a narrow cohort and a same-task comparison; count a draft as useful only when a participant chooses to keep it after review. Measure correction burden and task quality as well as time, then check voluntary repeat use. Do not publish participant audio/transcripts or claim results before Omkar conducts and documents the test.

## Browser voice-agent architecture research

Sources reviewed on 2026-11-01. These support feasibility and design choices; they do not guarantee network or model latency.

- **[6] OpenAI Realtime API guide** — https://developers.openai.com/api/docs/guides/realtime. Describes browser speech-to-speech sessions, server-created ephemeral client secrets, WebRTC transport, and realtime audio/event handling. The guide calls this a low-first-audio-latency path but publishes no universal latency SLA.
- **[7] OpenAI WebRTC guide** — https://developers.openai.com/api/docs/guides/voice-webrtc?api=realtime. Requires an application server to keep provider credentials private, a user gesture for microphone access, and an HTTPS or localhost browser context. Network setup, permission, ICE negotiation and playback remain latency/reliability contributors.
- **[8] OpenAI VAD guide** — https://developers.openai.com/api/docs/guides/realtime-vad. Describes automatic server VAD, semantic VAD, configurable eagerness and response interruption controls. For a no-cutoff portfolio guide, explicit push-to-talk/manual turn completion is safer than guessing when a long pause means the visitor has finished; the agent should not answer until the visitor releases/sends.
- **[9] OpenAI Voice Agents guide** — https://developers.openai.com/api/docs/guides/voice-agents. Recommends comparing speech architectures by use case and measuring task outcome, audible response latency, interruptions, unwanted silence and session reliability. It recommends comparing median and 95th-percentile timings; it does not promise zero latency.

Design implication: if a real-time concierge is approved, ask for microphone permission only after an explicit visitor action, stream via WebRTC, mint short-lived credentials on the server, keep a visible stop/mute control and text fallback, and avoid persisting audio or transcripts. Do not say “all latency issues solved”; measure on real devices and networks and publish no claim before testing.

## Browser-native speech, zero-provider-cost option

- **[10] MDN SpeechRecognition** — https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition. SpeechRecognition is not Baseline; some browsers use a remote recognition service by default and may send audio to it. Treat support and processing mode as explicit product choices, not guaranteed browser behavior.
- **[11] MDN `processLocally`** — https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally. When supported and set to `true`, recognition must run on-device. This is experimental and requires compatible language packs; do not silently fall back to remote recognition if local recognition is unavailable.
- **[12] MDN SpeechSynthesis** — https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis. Browser/device speech synthesis is widely available, but the voices and quality vary by user agent and device.

Design implication: a free first version can be a narrow, deterministic portfolio voice guide—not an open-ended LLM—using supported on-device recognition, locally matched portfolio intents, and native device speech synthesis. Ask for mic access only after an explicit action, and use the text interface when the browser, language pack or microphone is unavailable. No voice API bill or stored audio/transcript is needed for that design, but recognition quality and end-to-end latency still vary by device and must not be promised as uniform.
