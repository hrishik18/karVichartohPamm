import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getRadioStatus, getPlaylist } from './api';
import { removeToken } from './auth';
import { useToast } from '../components/Toast';
import { ThemeToggle } from '../components/ThemeProvider';
import LiveControl from './components/LiveControl';
import NowPlayingAdmin from './components/NowPlayingAdmin';
import SongQueue from './components/SongQueue';
import UploadSection from './components/UploadSection';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState({
    mode: 'music',
    currentSpeaker: null,
    currentTrack: null,
  });
  const [songs, setSongs] = useState([]);
  const [connected, setConnected] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const hasConnectedBefore = useRef(false);

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, playlistRes] = await Promise.all([
        getRadioStatus(),
        getPlaylist(),
      ]);
      setStatus(statusRes.data);
      setSongs(playlistRes.data);
    } catch (err) {
      console.error('Failed to fetch state:', err);
      toast.error('Failed to load dashboard data. Check your connection.');
    }
  }, [toast]);

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
    socket.on('playlist-update', (playlist) => {
      setSongs(playlist);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('status-update');
      socket.off('playlist-update');
      socket.close();
    };
  }, [fetchAll]);

  const handleLogout = () => {
    removeToken();
    navigate('/admin/login', { replace: true });
  };

  const refreshPlaylist = () => {
    getPlaylist()
      .then((res) => setSongs(res.data))
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-page text-heading">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-subtle">
        <div>
          <h1 className="text-lg font-bold">KVTP Admin</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-accent' : 'bg-red-500 animate-pulse'
              }`}
            />
            <span className="text-xs text-txt-secondary">
              {connected ? 'Live' : 'Reconnecting…'}
            </span>
            <span className="text-[10px] text-muted bg-elevated px-1.5 py-0.5 rounded-full">
              v{process.env.REACT_APP_VERSION || '1.0.0'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 rounded-lg bg-elevated hover:bg-elevated-hover transition-colors"
            aria-label="Help"
          >
            <span className="text-lg">❓</span>
          </button>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-elevated text-sm text-body hover:bg-elevated-hover transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Dashboard — 2-column layout (controls left, playlist right) */}
      <main className="p-4 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left column — Controls */}
          <div className="flex flex-col gap-4 lg:w-1/3 lg:min-w-[320px]">
            <LiveControl
              currentMode={status.mode}
              onError={toast}
            />

            <NowPlayingAdmin
              mode={status.mode}
              currentTrack={status.currentTrack}
            />

            <UploadSection onError={toast} onUploaded={refreshPlaylist} />
          </div>

          {/* Right column — Playlist */}
          <div className="flex flex-col gap-4 lg:flex-1">
            <SongQueue
              songs={songs}
              currentTrackId={status.currentTrack?.id}
              onError={toast}
              onRefresh={refreshPlaylist}
            />
          </div>
        </div>
      </main>

      {/* Help modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-subtle"
            style={{ backgroundColor: 'var(--color-page)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-heading">Admin Panel Guide</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-lg hover:bg-elevated transition-colors text-muted hover:text-heading"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-3 text-sm text-body">
              <li className="flex gap-3">
                <span className="text-xl shrink-0">📤</span>
                <div><strong className="text-heading">Upload Songs</strong> — Select up to 10 audio files at once. They're uploaded and added to the playlist automatically.</div>
              </li>
              <li className="flex gap-3">
                <span className="text-xl shrink-0">🎵</span>
                <div><strong className="text-heading">Song Queue</strong> — Drag to reorder, or expand a song to move up/down, edit title, play, or remove it.</div>
              </li>
              <li className="flex gap-3">
                <span className="text-xl shrink-0">🎙️</span>
                <div><strong className="text-heading">Go Live</strong> — Toggle speaker mode. Music pauses automatically and resumes when you stop.</div>
              </li>
              <li className="flex gap-3">
                <span className="text-xl shrink-0">✅</span>
                <div><strong className="text-heading">Bulk Actions</strong> — Use Select mode to pick multiple songs, then remove them at once. You can also shuffle the playlist.</div>
              </li>
              <li className="flex gap-3">
                <span className="text-xl shrink-0">🔍</span>
                <div><strong className="text-heading">Search</strong> — Filter songs by title in the queue using the search bar.</div>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
