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
  const socketRef = useRef(null);

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
    socketRef.current = socket;

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
      socketRef.current = null;
    };
  }, [applyUpdate, fetchStatus, fetchPlaylist]);

  // Auto-select first playlist track when there's no active track
  useEffect(() => {
    if (!activeTrack && playlist.length > 0 && radioState.mode === 'music') {
      setActiveTrack(playlist[0]);
      setActiveStartTime(null);
    }
  }, [playlist, activeTrack, radioState.mode]);

  // Handle track ended → notify backend to advance queue
  const handleTrackEnded = useCallback(() => {
    if (!activeTrack?.id) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit('song-ended', { id: activeTrack.id });
    }
  }, [activeTrack]);

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
        speakerLive={radioState.mode === 'speaker'}
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
          currentTrack={isStream ? null : activeTrack}
        />
      </main>

      {/* WhatsApp floating button */}
      <a
        href="https://wa.me/917559360210?text=Jai%20Prabhu"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white pl-4 pr-5 py-3 rounded-full shadow-lg shadow-black/30 transition-colors"
        aria-label="Contact us on WhatsApp"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="text-sm font-semibold">Contact Us</span>
      </a>

      <footer className="pb-6 text-center text-xs text-gray-600">
        KVTP &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
