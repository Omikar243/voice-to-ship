# VOICE TO SHIP — PRD

## Original problem
Interactive portfolio "VOICE TO SHIP" for Omkar Shettigar (Bengaluru data scientist). React 19 + Vite + TS frontend, Express 5 API deployed as Vercel serverless functions (repo `github.com/Omikar243/voice-to-ship`, main branch auto-deploys), Neon Postgres analytics, Gemini Flash-powered voice agent answering visitor questions (browser SpeechRecognition/SpeechSynthesis → POST /api/voice/answer).

## Request in this session (deployment verification + fix)
1. Wait for the retry-enabled Gemini deployment to finish building.
2. Confirm the final Gemini deployment is ready and aliased to production.
3. Run the final live Gemini voice test on the stable production alias.
4. Inspect recent Vercel runtime errors from before the final deployment became ready.
5. Check everything against the connected repo.

## Findings (2026-11-02)
- Vercel commit status for `fd8ad9e` (retry commit, == origin/main): **success, "Deployment has completed"** (ready).
- Vercel project renamed over time (voice-to-ship-analytics-routes → voice-to-ship → voice-to-ship-gemini-retry); production domain stays **https://voice-to-ship.vercel.app**.
- **Live voice test on production FAILED**: POST /api/voice/answer → HTTP 500 after 15–23s (4/4). All other endpoints healthy (health 200, CV PDF 200/64.7KB, validation 400, analytics auth 401 as designed).
- **Root cause**: retry loop only handled HTTP 429/503 responses; a fetch rejection (AbortSignal timeout — matching the 15s latencies observed) escaped uncaught → bare 500. Present in both old and new deployed code.
- Repo ↔ production match verified: local build of main reproduces production's exact asset hashes (`index-2HZGu-YC.js`, `index-D40uTg6x.css`); origin/main == local main == fd8ad9e; GitHub Actions "validate" green on all recent commits.

## Fix implemented (pending push to GitHub → Vercel auto-deploy)
`server/voiceAgent.js`: retry loop now catches fetch rejections too (3 attempts, 350ms/700ms backoff), exhausted retries map to a proper 502 (never an unhandled 500), per-attempt provider timeout 15s → 10s (3 attempts fit function limits). `test/portfolio.test.js`: 2 regression tests (retry-through-failure via fetch stub; persistent failure → 502). Verified: 7/7 tests, typecheck, build clean.

## Personas
- Recruiter/visitor: browses portfolio, asks the voice agent questions, downloads CV, plays Signal Lost.
- Owner (Omkar): sign-in-gated analytics dashboard (Manus OAuth, owner-only), CV-download notifications.

## Core requirements (static)
- Voice agent answers only from verified facts, 1–3 sentences, ≤900-char questions, no transcript storage.
- First-party analytics only; no PII; 30-day raw retention; owner-only dashboards.
- Cinematic charcoal/warm-orange editorial design, Evolving Signal SVG identity, reduced-motion support.

## Backlog / next
- P0: Push fix (Save to Github) → confirm Vercel production deployment → re-run live Gemini voice test.
- P1: Confirm production alias via Vercel token (user skipped secure card this session); pull runtime logs for the pre-fix 500s.
- P2: Consider Retry-After awareness / jittered backoff for Gemini capacity errors; surface provider health on /api/health.
