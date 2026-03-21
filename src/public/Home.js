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
    streamUrl: FALLBACK_STREAM_URL,
  });
  const [socketConnected, setSocketConnected] = useState(false);
  const hasConnectedBefore = useRef(false);

  const applyUpdate = useCallback((data) => {
    setRadioState((prev) => ({
      mode: data.mode ?? prev.mode,
      currentSpeaker: data.currentSpeaker ?? null,
      currentTrack: data.currentTrack ?? null,
      streamUrl: data.streamUrl || prev.streamUrl || FALLBACK_STREAM_URL,
    }));
  }, []);

  const fetchStatus = useCallback(() => {
    axios
      .get(`${API_URL}/api/radio/status`)
      .then((res) => applyUpdate(res.data))
      .catch((err) => console.error('Failed to fetch status:', err));
  }, [applyUpdate]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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
      }
      hasConnectedBefore.current = true;
    });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('status-update', (data) => applyUpdate(data));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('status-update');
      socket.close();
    };
  }, [applyUpdate, fetchStatus]);

  return (
    <div className="min-h-screen bg-primary text-white flex flex-col">
      <header className="pt-8 pb-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">KarVichar Radio</h1>
        <p className="text-sm text-gray-400 mt-1">Listen. Reflect. Evolve.</p>
      </header>

      <StatusBanner
        socketConnected={socketConnected}
        streamUrl={radioState.streamUrl}
      />

      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4 pb-12">
        <AudioPlayer streamUrl={radioState.streamUrl} />
        <NowPlaying
          mode={radioState.mode}
          currentSpeaker={radioState.currentSpeaker}
          currentTrack={radioState.currentTrack}
        />
      </main>

      <footer className="pb-6 text-center text-xs text-gray-600">
        KarVichar Radio &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
