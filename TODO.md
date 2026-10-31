# VOICE TO SHIP — Project outcomes

- [x] **Cinematic homepage and brand foundation**
  - Build a premium interactive personal portfolio website called “VOICE TO SHIP” for Omkar Shettigar, a data scientist, AI/ML builder and curious product thinker based in Bengaluru, India.
  - Use a cinematic editorial visual style inspired by independent digital magazines, interactive storytelling websites and premium creative studios: deep charcoal or near-black background, restrained off-white typography, one distinctive accent colour, generous whitespace, subtle grain or texture, and elegant transitions.
  - Make the design original, thoughtful and memorable; avoid generic AI-generated portfolio templates, excessive gradients, floating glass cards, generic skill bars and unnecessary 3D effects.
  - Open with the exact headline “I build things to understand how they work.” and the introduction “Data scientist by profession. Builder by instinct. Curious about what happens when ideas meet execution.”
  - Include an elegant animated visual inspired by a voice waveform that gradually transforms into a line or path representing an idea becoming reality.
  - Build the visual foundation and homepage first, make the experience cohesive before adding complex features, and keep the code maintainable and the design consistent.

- [x] **Interactive entry choices and recruiter-first navigation**
  - Provide three prominent interactive choices: “Show me what I've built”, “Show me how I think”, and “Show me what I've learned”.
  - Include the four routes from the experience mock-up: “Explore my work”, “Enter the lab”, “Play the Idea Engine”, and “Test my thinking”.
  - Create smooth scroll transitions, interactive chapter navigation and thoughtful micro-interactions that guide visitors into relevant chapters.
  - Do not let the game distract from the hiring objective: recruiters should be able to understand who Omkar is and inspect his best work within 60–90 seconds. The game must be an optional discovery experience, never a barrier before the projects.

- [x] **The Evolving Signal visual identity**
  - Implement one continuous, animated SVG line that tells the story of an idea becoming reality and acts as a recurring visual identity across the portfolio, rather than using unrelated section animations.
  - Show seven visual states: “The Signal” starts as an irregular audio waveform on the homepage; “The Direction” smooths through the story; “The Connections” links project milestones with interactive nodes; “The Exploration” branches in the lab; “The Interruption” fragments or doubles back in the honest bit and reconnects; “The Convergence” brings branches together in the Wispr section; “The Loop” forms a subtle circular mark at contact.
  - Progressively draw the line according to scroll position. Hovering or focusing a project illuminates its corresponding node; opening a case study highlights its path; switching Voice Lab mode highlights the selected alternate branch; the honest section shows a break reconnecting; and the ending completes a loop.
  - Include a small chapter-progress indicator that follows the current section and allows navigation. The SVG must never block text, links, buttons or other interactions.
  - Use a thin warm-orange SVG stroke against deep charcoal, restrained glow only for active nodes, and low contrast for inactive sections. Keep animation responsive and modular, avoid excessive React state updates, and provide a static but beautiful line for reduced-motion users.
  - Use Lenis for smooth scrolling and synchronize the signal with scroll progress. Keep the signal itself SVG, not a 3D object. Any separate Vanta.js or Spline-inspired atmosphere must be understated and must not slow mobile.

- [ ] **Story, work and learning chapters**
  - Include “The story” as a personal narrative, not a conventional education or employment timeline, with clearly labelled placeholders for missing facts.
  - Include “The work” with expandable project case studies structured around problem, ownership, decisions, process, outcome and evidence.
  - Include “The lab” for experiments and observations, including an interactive voice-versus-typing comparison.
  - Include “The honest bit” for genuine mistakes, trade-offs and lessons, using explicit placeholders until source material is supplied.
  - Include “What I'm exploring” for current research questions and future interests.
  - Do not invent project metrics, employment history, achievements, testimonials or campaign results; use clearly labelled placeholders wherever information is missing. The complete uploaded CV is deliberately available as a separate download, rather than turning the portfolio story into a conventional employment timeline.

- [ ] **Three signature experiences: Voice Lab, Idea Engine, Decision Room**
  - Make the Voice Lab evidence for the challenge by showing a voice-versus-typing comparison. Do not request microphone access just to make the website feel voice-enabled, and do not autoplay audio.
  - Make the Idea Engine the signature optional experience: a 60-second challenge that is clearly a discovery interaction, not a gateway to work or hiring information.
  - Include the Decision Room as an interactive way to demonstrate product/growth thinking.
  - Do not store game answers or visitor identity; when analytics is on, record only the stable click/impression IDs defined by the analytics policy. Visitors can opt out of anonymous tracking.
  - Keep the Voice Lab explicitly marked as a prototype until Omkar supplies real Wispr Flow test observations and evidence; the starter text is illustrative, not a claimed experiment. The supplied challenge notes recommend Omkar actually using Wispr Flow during the challenge, but this website build does not claim that account activity or a screen recording happened.

- [x] **First-party traffic analytics and click-through reporting**
  - Count page views, visible control impressions and clicks, then calculate per-control click-through rate as clicks divided by impressions. Record every interactive link, button and option in the portfolio, including chapter navigation, experience choices, project expanders, lab modes/actions, Idea Engine controls, Decision Room options and contact links.
  - Record anonymous events by default with a visible notice and an opt-out control. Do not store typed or pasted text, names, email addresses, raw IP addresses, user-agent strings or visitor identity. Do not forward event data to a third-party analytics provider.
  - Store raw event rows for no longer than 30 days and retain longer-lived daily aggregate counts for traffic and per-control CTR. Do not count Preview traffic as live production traffic; label the two sources separately.
  - Provide an owner-only analytics dashboard behind Manus sign-in; public visitors must not be able to read analytics summaries. Preserve real login and role checks in Preview and production.
  - The managed development and published database are shared; distinguish Preview-originated records and avoid destructive testing or reset operations.
  - Give each repeated Idea Engine answer control a stable, round-specific analytics ID; do not collapse distinct prompt choices into one reused DOM-position ID.
  - Guard public anonymous event ingestion against fabricated IDs and excessive request volume so the owner’s click-through aggregates remain useful.

- [x] **Full CV download and owner notification**
  - Add a clear download button that serves the exact full CV PDF supplied by Omkar, including its work-history and contact sections, as the downloadable file.
  - Only count `resume_download` after the complete attachment response finishes; show the download total separately from clicks/impressions so CV-download click-through rate is also visible.
  - Visitors who opt out of analytics must not be added to the anonymous download total. After each completed download, send one notification to the Manus project owner using the built-in Manus owner-notification service; include no visitor identity, IP address, user-agent or typed content. Notification failure must not interrupt the download.
  - The visible privacy notice must disclose the owner notification and clarify that opting out stops analytics counts but not the separately requested operational download notice.
  - The built-in owner-notification service confirms acceptance, not email delivery; keep that delivery limitation explicit.

- [x] **Wispr relevance and speculative growth experiment**
  - Include “What I'd bring to Wispr” as a clearly labelled speculative India growth experiment.
  - Keep hypotheses and prospective results explicitly speculative; do not present them as an existing campaign or established results.

- [ ] **Contact and responsive quality**
  - Provide contact access for LinkedIn, GitHub and email, with placeholders for any missing URLs or addresses.
  - Make the website responsive, fast, accessible and excellent on desktop and mobile.
  - Respect reduced-motion preferences and keep any separate background animation restrained; do not use a heavy 3D background that slows mobile.
