import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import AudioPlayer from './AudioPlayer';
import NowPlaying from './NowPlaying';
import StatusBanner from './StatusBanner';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const FALLBACK_STREAM_URL = process.env.REACT_APP_STREAM_URL || '';

export default function Home() {
  const [radioState, setRadioState] = useState({
    mode: 'music',
    currentSpeaker: null,
    currentTrack: null,
    startTime: null,
    streamUrl: FALLBACK_STREAM_URL,
  });
  const [playlist, setPlaylist] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [activeStartTime, setActiveStartTime] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const hasConnectedBefore = useRef(false);
  const backendTrackId = useRef(null);

  const applyUpdate = useCallback((data) => {
    setRadioState((prev) => ({
      mode: data.mode ?? prev.mode,
      currentSpeaker: data.currentSpeaker ?? null,
      currentTrack: data.currentTrack ?? null,
      startTime: data.startTime ?? null,
      streamUrl: data.streamUrl || prev.streamUrl || FALLBACK_STREAM_URL,
    }));
    // Sync active track when backend track changes
    const newTrackId = data.currentTrack?.id;
    if (newTrackId && newTrackId !== backendTrackId.current) {
      backendTrackId.current = newTrackId;
      setActiveTrack(data.currentTrack);
      setActiveStartTime(data.startTime ?? null);
    } else if (!data.currentTrack) {
      backendTrackId.current = null;
      setActiveTrack(null);
      setActiveStartTime(null);
    }
  }, []);

  const fetchStatus = useCallback(() => {
    axios
      .get(`${API_URL}/api/radio/status`)
      .then((res) => applyUpdate(res.data))
      .catch((err) => console.error('Failed to fetch status:', err));
  }, [applyUpdate]);

  const fetchPlaylist = useCallback(() => {
    axios
      .get(`${API_URL}/api/radio/playlist`)
      .then((res) => setPlaylist(res.data))
      .catch((err) => console.error('Failed to fetch playlist:', err));
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchPlaylist();
  }, [fetchStatus, fetchPlaylist]);

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      if (hasConnectedBefore.current) {
        fetchStatus();
        fetchPlaylist();
      }
      hasConnectedBefore.current = true;
    });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('status-update', (data) => applyUpdate(data));
    socket.on('playlist-update', (data) => setPlaylist(data));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('status-update');
      socket.off('playlist-update');
      socket.close();
    };
  }, [applyUpdate, fetchStatus, fetchPlaylist]);

  // Handle track ended → advance to next in playlist
  const handleTrackEnded = useCallback(() => {
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex((s) => s.id === activeTrack?.id);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % playlist.length : 0;
    setActiveTrack(playlist[nextIndex]);
    setActiveStartTime(Math.floor(Date.now() / 1000));
  }, [playlist, activeTrack]);

  // Determine audio source and mode
  const isStream = radioState.mode === 'speaker';
  const audioSrc = isStream ? radioState.streamUrl : activeTrack?.url || null;

  return (
    <div className="min-h-screen bg-primary text-white flex flex-col">
      <header className="pt-8 pb-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">KVTP</h1>
        <p className="text-sm text-gray-400 mt-1">Kar Vichar Toh Pamm</p>
      </header>

      <StatusBanner
        socketConnected={socketConnected}
        streamUrl={radioState.streamUrl}
      />

      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4 pb-12">
        <AudioPlayer
          src={audioSrc}
          isStream={isStream}
          startTime={activeStartTime}
          duration={activeTrack?.duration}
          onEnded={handleTrackEnded}
        />
        <NowPlaying
          mode={radioState.mode}
          currentSpeaker={isStream ? radioState.currentSpeaker : null}
          currentTrack={isStream ? null : activeTrack}
        />
      </main>

      <footer className="pb-6 text-center text-xs text-gray-600">
        KVTP &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
