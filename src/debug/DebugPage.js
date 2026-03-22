import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const ENV_STREAM_URL = process.env.REACT_APP_STREAM_URL || '';
const MAX_LOGS = 50;
const TABS = ['Overview', 'API', 'WebSocket', 'Audio', 'Logs'];

function ts() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 3 });
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-gray-400 hover:bg-white/20 transition-colors">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function CollapsibleJson({ data, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const str = data ? JSON.stringify(data, null, 2) : '—';
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => setOpen(!open)} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
          {open ? '▼ Hide JSON' : '▶ Show JSON'}
        </button>
        {data && <CopyBtn text={data} />}
      </div>
      {open && (
        <pre className="bg-black/40 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto max-h-64 whitespace-pre-wrap">
          {str}
        </pre>
      )}
    </div>
  );
}

function Pill({ color, children }) {
  const colors = {
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    purple: 'bg-purple-500/20 text-purple-400',
    gray: 'bg-white/10 text-gray-400',
    blue: 'bg-blue-500/20 text-blue-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

function Dot({ color }) {
  const c = color === 'green' ? 'bg-green-500' : color === 'red' ? 'bg-red-500' : color === 'yellow' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-600';
  return <span className={`inline-block w-2 h-2 rounded-full ${c}`} />;
}

export default function DebugPage() {
  const [tab, setTab] = useState('Overview');

  // --- Health check ---
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [healthLatency, setHealthLatency] = useState(null);
  const [healthFetchedAt, setHealthFetchedAt] = useState(null);

  // --- Backend status ---
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [statusLatency, setStatusLatency] = useState(null);
  const [statusFetchedAt, setStatusFetchedAt] = useState(null);

  // --- Playlist ---
  const [queue, setQueue] = useState(null);
  const [queueError, setQueueError] = useState(null);
  const [queueLatency, setQueueLatency] = useState(null);
  const [queueFetchedAt, setQueueFetchedAt] = useState(null);

  // --- WebSocket ---
  const [socketState, setSocketState] = useState('disconnected');
  const [socketId, setSocketId] = useState(null);
  const [lastWsPayload, setLastWsPayload] = useState(null);
  const [lastWsTime, setLastWsTime] = useState(null);
  const [wsEventCount, setWsEventCount] = useState(0);

  // --- Audio ---
  const audioRef = useRef(null);
  const [audioState, setAudioState] = useState('idle');
  const [audioError, setAudioError] = useState(null);

  // --- Logs ---
  const [logs, setLogs] = useState([]);

  // --- Auto-refresh ---
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef(null);

  const addLog = useCallback((msg) => {
    setLogs((prev) => [{ time: ts(), msg }, ...prev].slice(0, MAX_LOGS));
  }, []);

  const streamUrl = status?.streamUrl || ENV_STREAM_URL;

  // --- Fetch health ---
  const fetchHealth = useCallback(() => {
    addLog('Fetching /api/health…');
    const t0 = Date.now();
    axios
      .get(`${API_URL}/api/health`)
      .then((res) => {
        setHealthLatency(Date.now() - t0);
        setHealth(res.data);
        setHealthError(null);
        setHealthFetchedAt(ts());
        addLog(`Health OK (${Date.now() - t0}ms)`);
      })
      .catch((err) => {
        setHealthLatency(Date.now() - t0);
        setHealth(null);
        setHealthError(err.message);
        addLog(`Health FAILED: ${err.message}`);
      });
  }, [addLog]);

  // --- Fetch backend status ---
  const fetchStatus = useCallback(() => {
    addLog('Fetching /api/radio/status…');
    const t0 = Date.now();
    axios
      .get(`${API_URL}/api/radio/status`)
      .then((res) => {
        setStatusLatency(Date.now() - t0);
        setStatus(res.data);
        setStatusError(null);
        setStatusFetchedAt(ts());
        addLog(`Status OK (${Date.now() - t0}ms)`);
      })
      .catch((err) => {
        setStatusLatency(Date.now() - t0);
        setStatusError(err.message);
        addLog(`Status FAILED: ${err.message}`);
      });
  }, [addLog]);

  // --- Fetch playlist ---
  const fetchQueue = useCallback(() => {
    addLog('Fetching /api/radio/playlist…');
    const t0 = Date.now();
    axios
      .get(`${API_URL}/api/radio/playlist`)
      .then((res) => {
        setQueueLatency(Date.now() - t0);
        setQueue(res.data);
        setQueueError(null);
        setQueueFetchedAt(ts());
        addLog(`Playlist OK (${Date.now() - t0}ms)`);
      })
      .catch((err) => {
        setQueueLatency(Date.now() - t0);
        setQueueError(err.message);
        addLog(`Playlist FAILED: ${err.message}`);
      });
  }, [addLog]);

  const fetchAll = useCallback(() => {
    fetchHealth();
    fetchStatus();
    fetchQueue();
  }, [fetchHealth, fetchStatus, fetchQueue]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- Auto-refresh ---
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(fetchAll, 5000);
    } else {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefresh, fetchAll]);

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
      setWsEventCount((c) => c + 1);
      addLog('WS status-update received');
    });

    socket.on('playlist-update', (data) => {
      setWsEventCount((c) => c + 1);
      addLog('WS playlist-update received');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect_attempt');
      socket.off('status-update');
      socket.off('playlist-update');
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
  const audioPause = () => { audioRef.current?.pause(); };
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
  const latencyColor = (ms) => {
    if (ms == null) return 'text-gray-500';
    if (ms < 200) return 'text-green-400';
    if (ms < 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  // ================ RENDER ================

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Health card */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Health</h3>
          <button onClick={fetchHealth} className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] text-gray-400 hover:bg-white/20 transition-colors">Ping</button>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <Dot color={healthError ? 'red' : health ? 'green' : 'gray'} />
          <span className={`text-lg font-bold ${healthError ? 'text-red-400' : 'text-green-400'}`}>
            {healthError ? 'Down' : health ? 'Healthy' : '…'}
          </span>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>Latency: <span className={`font-mono font-semibold ${latencyColor(healthLatency)}`}>{healthLatency != null ? `${healthLatency}ms` : '—'}</span></span>
          {healthFetchedAt && <span>at {healthFetchedAt}</span>}
        </div>
        {healthError && <p className="text-red-400/80 text-xs mt-2 font-mono">{healthError}</p>}
      </div>

      {/* Mode card */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Current Mode</h3>
        <div className="flex items-center gap-3 mb-3">
          {status?.mode === 'speaker' ? (
            <Pill color="purple">🎙 Speaker Live</Pill>
          ) : (
            <Pill color="green">♫ Music</Pill>
          )}
        </div>
        {status?.currentTrack && (
          <div className="mt-2">
            <p className="text-xs text-gray-500">Now Playing</p>
            <p className="text-sm text-white font-medium truncate mt-0.5">{status.currentTrack.title}</p>
          </div>
        )}
        {status?.mode === 'speaker' && (
          <p className="text-xs text-gray-500 mt-2">Music paused — speaker is live</p>
        )}
        {!status && <p className="text-xs text-gray-500">Loading…</p>}
      </div>

      {/* WebSocket card */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">WebSocket</h3>
        <div className="flex items-center gap-3 mb-2">
          <Dot color={socketState === 'connected' ? 'green' : socketState === 'reconnecting' ? 'yellow' : 'red'} />
          <span className={`text-sm font-semibold ${socketState === 'connected' ? 'text-green-400' : socketState === 'reconnecting' ? 'text-yellow-400' : 'text-red-400'}`}>
            {socketState}
          </span>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>ID: <span className="font-mono text-gray-400">{socketId || '—'}</span></span>
          <span>Events: <span className="font-mono text-gray-400">{wsEventCount}</span></span>
        </div>
        {socketId && <div className="mt-2"><CopyBtn text={socketId} /></div>}
      </div>

      {/* Playlist summary card */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Playlist</h3>
          <Pill color="blue">{Array.isArray(queue) ? queue.length : 0} songs</Pill>
        </div>
        {Array.isArray(queue) && queue.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {queue.map((s, i) => (
              <div key={s.id || i} className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg ${status?.currentTrack?.id === s.id ? 'bg-accent/10 text-accent' : 'text-gray-400'}`}>
                <span className="text-gray-600 w-5 shrink-0 text-right font-mono">{i + 1}.</span>
                <span className="truncate">{s.title}</span>
                {s.duration && <span className="text-gray-600 shrink-0 ml-auto">{Math.floor(s.duration / 60)}:{String(s.duration % 60).padStart(2, '0')}</span>}
                {status?.currentTrack?.id === s.id && <span className="ml-1 shrink-0">▶</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600">Empty playlist</p>
        )}
        <div className="flex gap-4 text-xs text-gray-500 mt-3">
          <span>Latency: <span className={`font-mono font-semibold ${latencyColor(queueLatency)}`}>{queueLatency != null ? `${queueLatency}ms` : '—'}</span></span>
        </div>
      </div>

      {/* Environment card */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/5 md:col-span-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Environment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">API_URL</span>
            <span className="text-gray-300 truncate">{process.env.REACT_APP_API_URL || '(not set)'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">STREAM_URL</span>
            <span className="text-gray-300 truncate">{process.env.REACT_APP_STREAM_URL || '(not set)'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAPI = () => (
    <div className="flex flex-col gap-4">
      {/* Health */}
      <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GET /api/health</h3>
            <Dot color={healthError ? 'red' : health ? 'green' : 'gray'} />
            {healthLatency != null && <span className={`text-xs font-mono font-semibold ${latencyColor(healthLatency)}`}>{healthLatency}ms</span>}
          </div>
          <button onClick={fetchHealth} className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] text-gray-400 hover:bg-white/20 transition-colors">Ping</button>
        </div>
        {healthError && <p className="text-red-400 text-xs mb-2">{healthError}</p>}
        <CollapsibleJson data={health} defaultOpen />
        {healthFetchedAt && <p className="text-[10px] text-gray-600 mt-2">Fetched at {healthFetchedAt}</p>}
      </section>

      {/* Status */}
      <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GET /api/radio/status</h3>
            <Dot color={statusError ? 'red' : status ? 'green' : 'gray'} />
            {statusLatency != null && <span className={`text-xs font-mono font-semibold ${latencyColor(statusLatency)}`}>{statusLatency}ms</span>}
          </div>
          <button onClick={fetchStatus} className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] text-gray-400 hover:bg-white/20 transition-colors">Refresh</button>
        </div>
        {statusError && <p className="text-red-400 text-xs mb-2">{statusError}</p>}
        {status && (
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-black/20 rounded-lg px-3 py-2">
              <span className="text-gray-600">mode</span>
              <p className="text-white font-semibold">{status.mode}</p>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2">
              <span className="text-gray-600">currentTrack</span>
              <p className="text-white font-semibold truncate">{status.currentTrack?.title || '—'}</p>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2">
              <span className="text-gray-600">speaker</span>
              <p className="text-white font-semibold">{status.currentSpeaker ? 'Live' : 'Off'}</p>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2">
              <span className="text-gray-600">streamUrl</span>
              <p className="text-white font-mono text-[10px] truncate">{status.streamUrl || '—'}</p>
            </div>
          </div>
        )}
        <CollapsibleJson data={status} />
        {statusFetchedAt && <p className="text-[10px] text-gray-600 mt-2">Fetched at {statusFetchedAt}</p>}
      </section>

      {/* Playlist */}
      <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GET /api/radio/playlist</h3>
            <Pill color="blue">{Array.isArray(queue) ? queue.length : 0}</Pill>
            {queueLatency != null && <span className={`text-xs font-mono font-semibold ${latencyColor(queueLatency)}`}>{queueLatency}ms</span>}
          </div>
          <button onClick={fetchQueue} className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] text-gray-400 hover:bg-white/20 transition-colors">Refresh</button>
        </div>
        {queueError && <p className="text-red-400 text-xs mb-2">{queueError}</p>}
        {Array.isArray(queue) && queue.length > 0 && (
          <div className="space-y-1 mb-3 max-h-56 overflow-y-auto">
            {queue.map((s, i) => (
              <div key={s.id || i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${status?.currentTrack?.id === s.id ? 'bg-accent/10 border border-accent/20' : 'bg-black/20'}`}>
                <span className="text-gray-600 w-5 text-right font-mono shrink-0">{i + 1}</span>
                <span className={`truncate ${status?.currentTrack?.id === s.id ? 'text-accent font-semibold' : 'text-gray-300'}`}>{s.title}</span>
                {s.duration != null && (
                  <span className="text-gray-600 ml-auto shrink-0">{Math.floor(s.duration / 60)}:{String(s.duration % 60).padStart(2, '0')}</span>
                )}
                {status?.currentTrack?.id === s.id && <span className="text-accent shrink-0">▶</span>}
              </div>
            ))}
          </div>
        )}
        <CollapsibleJson data={queue} />
        {queueFetchedAt && <p className="text-[10px] text-gray-600 mt-2">Fetched at {queueFetchedAt}</p>}
      </section>
    </div>
  );

  const renderWebSocket = () => (
    <div className="flex flex-col gap-4">
      <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Connection</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-black/20 rounded-lg px-3 py-3 text-center">
            <Dot color={socketState === 'connected' ? 'green' : socketState === 'reconnecting' ? 'yellow' : 'red'} />
            <p className="text-xs text-white font-semibold mt-1">{socketState}</p>
            <p className="text-[10px] text-gray-600">Status</p>
          </div>
          <div className="bg-black/20 rounded-lg px-3 py-3 text-center">
            <p className="text-sm text-white font-mono font-bold">{wsEventCount}</p>
            <p className="text-[10px] text-gray-600">Events received</p>
          </div>
          <div className="bg-black/20 rounded-lg px-3 py-3 text-center">
            <p className="text-xs text-white font-mono truncate">{socketId || '—'}</p>
            <p className="text-[10px] text-gray-600">Socket ID</p>
          </div>
          <div className="bg-black/20 rounded-lg px-3 py-3 text-center">
            <p className="text-xs text-white font-mono">{lastWsTime || '—'}</p>
            <p className="text-[10px] text-gray-600">Last event</p>
          </div>
        </div>
        {socketId && <CopyBtn text={socketId} />}
      </section>

      <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last status-update Payload</h3>
          {lastWsPayload && <CopyBtn text={lastWsPayload} />}
        </div>
        {lastWsPayload ? (
          <>
            {lastWsPayload.mode && (
              <div className="flex gap-2 mb-3">
                <Pill color={lastWsPayload.mode === 'speaker' ? 'purple' : 'green'}>
                  {lastWsPayload.mode === 'speaker' ? '🎙 Speaker' : '♫ Music'}
                </Pill>
                {lastWsPayload.currentTrack && (
                  <Pill color="gray">▶ {lastWsPayload.currentTrack.title}</Pill>
                )}
              </div>
            )}
            <CollapsibleJson data={lastWsPayload} defaultOpen />
          </>
        ) : (
          <p className="text-xs text-gray-600">No events yet — waiting for status-update…</p>
        )}
      </section>
    </div>
  );

  const renderAudio = () => (
    <div className="flex flex-col gap-4">
      <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Stream Test</h3>
        <audio ref={audioRef} preload="none" />
        <div className="flex gap-2 mb-4">
          <button onClick={audioPlay} disabled={!streamUrl}
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-40">
            ▶ Play
          </button>
          <button onClick={audioPause}
            className="px-5 py-2.5 rounded-xl bg-white/10 text-sm text-gray-300 hover:bg-white/20 transition-colors">
            ⏸ Pause
          </button>
          <button onClick={audioReload} disabled={!streamUrl}
            className="px-5 py-2.5 rounded-xl bg-white/10 text-sm text-gray-300 hover:bg-white/20 transition-colors disabled:opacity-40">
            ↻ Reload
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-black/20 rounded-lg px-3 py-3">
            <p className="text-[10px] text-gray-600 mb-1">Playback State</p>
            <div className="flex items-center gap-2">
              <Dot color={audioState === 'playing' ? 'green' : audioState === 'buffering' ? 'yellow' : audioState === 'error' ? 'red' : 'gray'} />
              <span className="text-sm text-white font-semibold">{audioState}</span>
            </div>
          </div>
          <div className="bg-black/20 rounded-lg px-3 py-3">
            <p className="text-[10px] text-gray-600 mb-1">Stream URL</p>
            <p className="text-xs text-gray-300 font-mono break-all">{streamUrl || '(none)'}</p>
          </div>
        </div>

        {audioError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <p className="text-red-400 text-xs">{audioError}</p>
          </div>
        )}
      </section>
    </div>
  );

  const renderLogs = () => (
    <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Event Log <span className="text-gray-600 normal-case font-normal">({logs.length}/{MAX_LOGS})</span>
        </h3>
        <button onClick={() => setLogs([])} className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] text-gray-400 hover:bg-white/20 transition-colors">
          Clear
        </button>
      </div>
      <div className="bg-black/40 rounded-lg p-3 max-h-[28rem] overflow-y-auto font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-gray-600">No logs yet</p>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="text-gray-400 py-0.5 hover:bg-white/5 rounded px-1 -mx-1">
              <span className="text-gray-600">[{l.time}]</span> {l.msg}
            </div>
          ))
        )}
      </div>
    </section>
  );

  const tabContent = {
    Overview: renderOverview,
    API: renderAPI,
    WebSocket: renderWebSocket,
    Audio: renderAudio,
    Logs: renderLogs,
  };

  return (
    <div className="min-h-screen bg-primary text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">KVTP Debug Console</h1>
            <p className="text-[10px] text-gray-600 mt-0.5">Internal diagnostics — not for end users</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-accent w-3.5 h-3.5 rounded"
              />
              Auto-refresh (5s)
            </label>
            <button onClick={fetchAll} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs text-gray-300 hover:bg-white/20 transition-colors">
              ↻ Refresh All
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-white/10 px-4 overflow-x-auto">
        <div className="max-w-5xl mx-auto flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                tab === t
                  ? 'border-accent text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab content */}
      <main className="p-4 max-w-5xl mx-auto">
        {tabContent[tab]?.()}
      </main>
    </div>
  );
}
