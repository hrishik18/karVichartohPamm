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
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-accent' : 'bg-red-500 animate-pulse'
              }`}
            />
            <span className="text-xs text-txt-secondary">
              {connected ? 'Live' : 'Reconnecting…'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
    </div>
  );
}
