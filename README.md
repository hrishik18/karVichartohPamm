# KarVichar Radio — Listener App

> Listen. Reflect. Evolve.

A mobile-first React web app for listening to the KarVichar live radio stream with real-time updates.

## Features

- **Live Audio Streaming** — HTML5 audio player with play/pause
- **Now Playing** — Shows current song title or speaker name in real time
- **Real-Time Updates** — Socket.io WebSocket integration for instant state sync
- **Status Banner** — Connection and stream status indicators
- **Dark Theme** — Clean, minimal dark UI
- **PWA** — Installable on mobile (Add to Home Screen)

## Tech Stack

- React 18 (CRA + CRACO)
- Tailwind CSS 3
- Axios
- Socket.io-client

## Getting Started

### Prerequisites

- Node.js 18+
- Backend server running ([karVicharTohPamm-Backend](../karVicharTohPamm-Backend))

### Install

```bash
cd karVichartohPamm
npm install
```

### Configure

Create a `.env` file (or edit the existing one):

```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STREAM_URL=http://<caster-host>:<port>/R5a6I
```

The app prefers the `streamUrl` from the backend API/WebSocket response. The env variable is a fallback.

### Run

```bash
npm start
```

Opens at [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

Outputs to `build/` folder, ready for static hosting.

## Project Structure

```
src/
  components/
    AudioPlayer.js    — Stream playback with play/pause + loading state
    NowPlaying.js     — Current mode, speaker, or song display
    StatusBanner.js   — WebSocket + stream status indicators
  App.js              — Main app: API fetch + WebSocket + layout
  index.js            — Entry point with PWA registration
  index.css           — Tailwind directives + base styles
  serviceWorkerRegistration.js — PWA service worker registration
public/
  service-worker.js   — Offline caching service worker
  manifest.json       — PWA manifest
  index.html          — HTML shell
```

## API Integration

| Endpoint | Method | Description |
|---|---|---|
| `/api/radio/status` | GET | Fetch current radio state + stream URL |

## WebSocket

Connects to backend via Socket.io and listens for:
- `status-update` — Real-time radio state changes
