import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getRadioStatus, getRadioQueue } from './api';
import { removeToken } from './auth';
import ModeControl from './components/ModeControl';
import NowPlayingAdmin from './components/NowPlayingAdmin';
import SongQueue from './components/SongQueue';
import SpeakerQueue from './components/SpeakerQueue';
import UploadSection from './components/UploadSection';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState({
    mode: 'music',
    currentSpeaker: null,
    currentTrack: null,
  });
  const [queue, setQueue] = useState({ songs: [], speakers: [] });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const hasConnectedBefore = useRef(false);

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, queueRes] = await Promise.all([
        getRadioStatus(),
        getRadioQueue(),
      ]);
      setStatus(statusRes.data);
      setQueue(queueRes.data);
    } catch (err) {
      console.error('Failed to fetch state:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // WebSocket for live preview
  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      setConnected(true);
      if (hasConnectedBefore.current) {
        fetchAll();
      }
      hasConnectedBefore.current = true;
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('status-update', (data) => {
      setStatus((prev) => ({
        mode: data.mode ?? prev.mode,
        currentSpeaker: data.currentSpeaker ?? null,
        currentTrack: data.currentTrack ?? null,
      }));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('status-update');
      socket.close();
    };
  }, [fetchAll]);

  // Auto-clear error
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const handleLogout = () => {
    removeToken();
    navigate('/admin/login', { replace: true });
  };

  const refreshQueue = () => {
    getRadioQueue()
      .then((res) => setQueue(res.data))
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-primary text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div>
          <h1 className="text-lg font-bold">KVTP Admin</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-accent' : 'bg-red-500 animate-pulse'
              }`}
            />
            <span className="text-xs text-gray-400">
              {connected ? 'Live' : 'Reconnecting…'}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg bg-white/10 text-sm text-gray-300 hover:bg-white/20 transition-colors"
        >
          Logout
        </button>
      </header>

      {/* Error toast */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-2 bg-red-500/20 text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Dashboard grid */}
      <main className="p-4 flex flex-col gap-4 max-w-2xl mx-auto">
        <ModeControl currentMode={status.mode} onError={setError} />

        <NowPlayingAdmin
          mode={status.mode}
          currentSpeaker={status.currentSpeaker}
          currentTrack={status.currentTrack}
        />

        <UploadSection onError={setError} />

        <SongQueue
          songs={queue.songs}
          onError={setError}
          onRefresh={refreshQueue}
        />

        <SpeakerQueue
          speakers={queue.speakers}
          onError={setError}
          onRefresh={refreshQueue}
        />
      </main>
    </div>
  );
}
