# Voice to Ship Live Voice Service

This FastAPI service is a small Gemini Live token broker. It never proxies microphone audio and never exposes the permanent `GEMINI_API_KEY` to the browser.

## Local run

```bash
cd voice-service
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY='...'
export ALLOWED_ORIGINS='http://localhost:5173,http://localhost:3000'
export GEMINI_LIVE_MODEL='gemini-3.8-live'
uvicorn app.main:app --reload --port 8000
```

Endpoints:

- `GET /health` returns service readiness and the configured Live model.
- `POST /live-token` creates a single-use, short-lived Gemini Live token restricted to audio responses and the portfolio system instruction.

## Deployment

Deploy this directory as a Python service on a host that supports long-lived HTTP services or WebSockets. Set `GEMINI_API_KEY`, `GEMINI_LIVE_MODEL`, and `ALLOWED_ORIGINS` in the host secret manager. Set the frontend's `VITE_VOICE_SERVICE_URL` to the resulting HTTPS URL.

The browser should use the returned token with Gemini's Live WebSocket endpoint and send 16-bit PCM audio at 16 kHz. Gemini returns 24 kHz PCM audio for playback through `AudioContext`.
