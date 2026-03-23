# KarVichar TohPamm — Frontend

> Listen. Reflect. Evolve.

Mobile-first React web app for the KarVichar TohPamm online radio platform — a public **listener page** and a protected **admin dashboard**.

## Features

- **Listener** — Live audio streaming, now playing display, continuous playback synced via WebSocket, contact buttons (WhatsApp + Email)
- **Admin** — Multi-file upload (max 10), playlist management (reorder/edit/play/remove), live speaker toggle
- **Debug** — Tabbed diagnostics page with API latency, WebSocket status, and auto-refresh

## Tech Stack

React 18, CRACO, Tailwind CSS 3, React Router v7, Axios, Socket.io-client

## Getting Started

### Prerequisites

- Node.js 18+
- Backend running ([karVicharTohPamm-Backend](../karVicharTohPamm-Backend))

### Install & Run

```bash
npm install
npm start        # http://localhost:3000
```

### Environment Variables

Create a `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STREAM_URL=http://<caster-host>:<port>/<mount>
```

> `REACT_APP_*` vars are baked in at **build time** (CRA limitation). The app prefers `streamUrl` from the backend API; env is a fallback.

### Build

```bash
npm run build    # outputs to build/
```

## Project Structure

```
src/
├── public/          # Listener page (Home, AudioPlayer, NowPlaying, StatusBanner)
├── admin/           # Admin panel (Dashboard, Login, ProtectedRoute, api, auth)
│   └── components/  # UploadSection, LiveControl, SongQueue, NowPlayingAdmin
├── debug/           # DebugPage
├── components/      # Shared components
├── App.js           # Router
└── index.js         # Entry point
```

## Routes

| Path | Component | Auth |
|------|-----------|------|
| `/` | Home (Listener) | No |
| `/admin/login` | Login | No |
| `/admin` | Dashboard | Yes (JWT) |
| `/debug` | DebugPage | No |

## Deployment

Deployed to Azure App Service via GitHub Actions. `REACT_APP_API_URL` and `REACT_APP_STREAM_URL` are set as build-time env vars in the workflow. Served with PM2 in SPA mode.
