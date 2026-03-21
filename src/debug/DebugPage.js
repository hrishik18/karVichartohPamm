import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const ENV_STREAM_URL = process.env.REACT_APP_STREAM_URL || '';
const MAX_LOGS = 20;

function ts() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 3 });
}

export default function DebugPage() {
  // --- Health check ---
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [healthFetchedAt, setHealthFetchedAt] = useState(null);

  // --- Backend status ---
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [statusFetchedAt, setStatusFetchedAt] = useState(null);

  // --- Queue ---
  const [queue, setQueue] = useState(null);
  const [queueError, setQueueError] = useState(null);
  const [queueFetchedAt, setQueueFetchedAt] = useState(null);

  // --- WebSocket ---
  const [socketState, setSocketState] = useState('disconnected');
  const [socketId, setSocketId] = useState(null);
  const [lastWsPayload, setLastWsPayload] = useState(null);
  const [lastWsTime, setLastWsTime] = useState(null);

  // --- Audio ---
  const audioRef = useRef(null);
  const [audioState, setAudioState] = useState('idle');
  const [audioError, setAudioError] = useState(null);

  // --- Logs ---
  const [logs, setLogs] = useState([]);

  const addLog = useCallback((msg) => {
    setLogs((prev) => [{ time: ts(), msg }, ...prev].slice(0, MAX_LOGS));
  }, []);

  // Stream URL: prefer backend, fallback env
  const streamUrl = status?.streamUrl || ENV_STREAM_URL;

  // --- Fetch health ---
  const fetchHealth = useCallback(() => {
    addLog('Fetching /api/health…');
    axios
      .get(`${API_URL}/api/health`)
      .then((res) => {
        setHealth(res.data);
        setHealthError(null);
        setHealthFetchedAt(ts());
        addLog('Health check OK');
      })
      .catch((err) => {
        setHealth(null);
        setHealthError(err.message);
        addLog(`Health check FAILED: ${err.message}`);
      });
  }, [addLog]);

  // --- Fetch backend status ---
  const fetchStatus = useCallback(() => {
    addLog('Fetching /api/radio/status…');
    axios
      .get(`${API_URL}/api/radio/status`)
      .then((res) => {
        setStatus(res.data);
        setStatusError(null);
        setStatusFetchedAt(ts());
        addLog('API status fetch success');
      })
      .catch((err) => {
        setStatusError(err.message);
        addLog(`API status fetch FAILED: ${err.message}`);
      });
  }, [addLog]);

  // --- Fetch queue ---
  const fetchQueue = useCallback(() => {
    addLog('Fetching /api/radio/queue…');
    axios
      .get(`${API_URL}/api/radio/queue`)
      .then((res) => {
        setQueue(res.data);
        setQueueError(null);
        setQueueFetchedAt(ts());
        addLog('Queue fetch success');
      })
      .catch((err) => {
        setQueueError(err.message);
        addLog(`Queue fetch FAILED: ${err.message}`);
      });
  }, [addLog]);

  useEffect(() => {
    fetchHealth();
    fetchStatus();
    fetchQueue();
  }, [fetchHealth, fetchStatus, fetchQueue]);

  // --- WebSocket ---
  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      setSocketState('connected');
      setSocketId(socket.id);
      addLog(`WS connected (id: ${socket.id})`);
    });

    socket.on('disconnect', (reason) => {
      setSocketState('disconnected');
      setSocketId(null);
      addLog(`WS disconnected: ${reason}`);
    });

    socket.on('reconnect_attempt', () => {
      setSocketState('reconnecting');
      addLog('WS reconnecting…');
    });

    socket.on('status-update', (data) => {
      setLastWsPayload(data);
      setLastWsTime(ts());
      addLog('WS status-update received');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect_attempt');
      socket.off('status-update');
      socket.close();
    };
  }, [addLog]);

  // --- Audio handlers ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => { setAudioState('playing'); setAudioError(null); addLog('Audio: playing'); };
    const onPause = () => { setAudioState('paused'); addLog('Audio: paused'); };
    const onWaiting = () => { setAudioState('buffering'); addLog('Audio: buffering'); };
    const onError = () => {
      setAudioState('error');
      setAudioError('Stream error');
      addLog('Audio: ERROR');
    };

    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('error', onError);
    };
  }, [addLog]);

  const audioPlay = () => {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;
    audio.pause();
    audio.src = streamUrl;
    audio.load();
    audio.play().catch(() => setAudioState('error'));
  };

  const audioPause = () => {
    audioRef.current?.pause();
  };

  const audioReload = () => {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;
    audio.pause();
    audio.src = streamUrl;
    audio.load();
    setAudioState('idle');
    setAudioError(null);
    addLog('Audio: reloaded');
  };

  // --- Helpers ---
  const stateColor = (s) => {
    if (s === 'connected' || s === 'playing') return 'text-green-400';
    if (s === 'reconnecting' || s === 'buffering') return 'text-yellow-400';
    return 'text-red-400';
  };

  const JsonBlock = ({ data }) => (
    <pre className="bg-black/40 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
      {data ? JSON.stringify(data, null, 2) : '—'}
    </pre>
  );

  return (
    <div className="min-h-screen bg-primary text-white p-4 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold">KVTP Debug</h1>
        <p className="text-xs text-gray-500 mt-1">Internal diagnostics — not for end users</p>
      </header>

      <div className="flex flex-col gap-4">
        {/* 1. Health Check */}
        <section className="bg-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Health Check
            </h2>
            <button
              onClick={fetchHealth}
              className="px-3 py-1 rounded-lg bg-white/10 text-xs text-gray-300 hover:bg-white/20 transition-colors"
            >
              Ping
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                healthError ? 'bg-red-500' : health ? 'bg-green-500' : 'bg-gray-600'
              }`}
            />
            <span className={healthError ? 'text-red-400' : 'text-green-400'}>
              {healthError ? `Down — ${healthError}` : health ? `${health.status || 'ok'}` : 'Checking…'}
            </span>
          </div>
          {healthFetchedAt && (
            <p className="text-xs text-gray-500 mt-2">Last checked: {healthFetchedAt}</p>
          )}
        </section>

        {/* 2. Backend Status */}
        <section className="bg-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Backend Status
            </h2>
            <button
              onClick={fetchStatus}
              className="px-3 py-1 rounded-lg bg-white/10 text-xs text-gray-300 hover:bg-white/20 transition-colors"
            >
              Refresh
            </button>
          </div>
          {statusError && (
            <p className="text-red-400 text-sm mb-2">Error: {statusError}</p>
          )}
          {statusFetchedAt && (
            <p className="text-xs text-gray-500 mb-2">Last fetched: {statusFetchedAt}</p>
          )}
          <JsonBlock data={status} />
        </section>

        {/* 3. Queue State */}
        <section className="bg-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Queue State
            </h2>
            <button
              onClick={fetchQueue}
              className="px-3 py-1 rounded-lg bg-white/10 text-xs text-gray-300 hover:bg-white/20 transition-colors"
            >
              Refresh
            </button>
          </div>
          {queueError && (
            <p className="text-red-400 text-sm mb-2">Error: {queueError}</p>
          )}
          {queueFetchedAt && (
            <p className="text-xs text-gray-500 mb-2">Last fetched: {queueFetchedAt}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Songs ({queue?.songs?.length ?? 0})</p>
              <JsonBlock data={queue?.songs} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Speakers ({queue?.speakers?.length ?? 0})</p>
              <JsonBlock data={queue?.speakers} />
            </div>
          </div>
        </section>

        {/* 4. WebSocket Status */}
        <section className="bg-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            WebSocket
          </h2>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mb-3">
            <span>
              Status: <span className={`font-semibold ${stateColor(socketState)}`}>{socketState}</span>
            </span>
            <span className="text-gray-500">
              ID: <span className="font-mono text-gray-300">{socketId || '—'}</span>
            </span>
          </div>
          {lastWsTime && (
            <p className="text-xs text-gray-500 mb-2">Last event: {lastWsTime}</p>
          )}
          <p className="text-xs text-gray-500 mb-1">Last status-update payload:</p>
          <JsonBlock data={lastWsPayload} />
        </section>

        {/* 5. Audio Stream Test */}
        <section className="bg-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Audio Stream
          </h2>
          <audio ref={audioRef} preload="none" />
          <div className="flex gap-2 mb-3">
            <button onClick={audioPlay} disabled={!streamUrl}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              Play
            </button>
            <button onClick={audioPause}
              className="px-4 py-2 rounded-lg bg-white/10 text-sm text-gray-300 hover:bg-white/20 transition-colors">
              Pause
            </button>
            <button onClick={audioReload} disabled={!streamUrl}
              className="px-4 py-2 rounded-lg bg-white/10 text-sm text-gray-300 hover:bg-white/20 transition-colors disabled:opacity-50">
              Reload
            </button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              State: <span className={`font-semibold ${stateColor(audioState)}`}>{audioState}</span>
            </span>
          </div>
          {audioError && <p className="text-red-400 text-sm mt-1">{audioError}</p>}
          <p className="text-xs text-gray-500 mt-2 font-mono break-all">
            URL: {streamUrl || '(none)'}
          </p>
        </section>

        {/* 6. Environment Info */}
        <section className="bg-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Environment
          </h2>
          <div className="text-sm font-mono space-y-1">
            <p>
              <span className="text-gray-500">REACT_APP_API_URL=</span>
              <span className="text-gray-300">{process.env.REACT_APP_API_URL || '(not set)'}</span>
            </p>
            <p>
              <span className="text-gray-500">REACT_APP_STREAM_URL=</span>
              <span className="text-gray-300">{process.env.REACT_APP_STREAM_URL || '(not set)'}</span>
            </p>
          </div>
        </section>

        {/* 7. Logs */}
        <section className="bg-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Logs <span className="text-gray-600 normal-case">(last {MAX_LOGS})</span>
            </h2>
            <button
              onClick={() => setLogs([])}
              className="px-3 py-1 rounded-lg bg-white/10 text-xs text-gray-300 hover:bg-white/20 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="bg-black/40 rounded-lg p-3 max-h-56 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-600">No logs yet</p>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="text-gray-400">
                  <span className="text-gray-600">[{l.time}]</span> {l.msg}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
