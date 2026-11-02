# Test credentials — VOICE TO SHIP

No static credentials exist for this app:
- Visitor flows (voice agent, CV download, analytics ingestion) are public; no login.
- Analytics dashboard uses Manus platform OAuth (owner-only, email-gated); no password.
- Runtime env vars (GEMINI_API_KEY, DATABASE_URL/Neon, MANUS_* ) live only in Vercel project settings (project: voice-to-ship-gemini-retry, team: omikar243s-projects, production domain: https://voice-to-ship.vercel.app). They are NOT in this workspace.
- VERCEL_TOKEN: user skipped adding it to the vault this session (2026-11-02).

Local verification needs no keys: `npx -y pnpm@11.25.0 test` stubs globalThis.fetch.
