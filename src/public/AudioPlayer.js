import { useRef, useState, useEffect, useCallback } from 'react';

const RETRY_DELAY = 3000;

export default function AudioPlayer({ src, isStream, startTime, duration, onEnded }) {
  const audioRef = useRef(null);
  const retryTimer = useRef(null);
  const prevSrc = useRef(src);
  const onEndedRef = useRef(onEnded);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Keep onEnded ref current
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  // Clear any pending retry on unmount
  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  // Compute sync offset for music mode
  const getSyncOffset = useCallback(() => {
    if (isStream || !startTime) return 0;
    const offset = Math.floor(Date.now() / 1000) - startTime;
    if (duration && offset >= duration) return -1; // track already ended
    return offset > 0 ? offset : 0;
  }, [isStream, startTime, duration]);

  // Handle src change while playing
  useEffect(() => {
    if (prevSrc.current !== src && playing) {
      const audio = audioRef.current;
      if (audio) {
        audio.src = src;
        audio.load();
        setLoading(true);
        const offset = getSyncOffset();
        if (offset === -1) {
          setLoading(false);
          setPlaying(false);
          if (onEndedRef.current) onEndedRef.current();
        } else {
          if (offset > 0) audio.currentTime = offset;
          audio.play().catch(() => {
            setLoading(false);
            setPlaying(false);
          });
        }
      }
    }
    prevSrc.current = src;
  }, [src, playing, getSyncOffset]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Clear any pending retry
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    setError(null);

    if (playing) {
      audio.pause();
      if (isStream) {
        audio.removeAttribute('src');
        audio.load();
      }
      setPlaying(false);
      setLoading(false);
    } else {
      // Stop any existing playback first to prevent overlap
      audio.pause();
      audio.currentTime = 0;
      audio.src = src;
      audio.load();
      setLoading(true);

      // Apply sync offset for music mode
      const offset = getSyncOffset();
      if (offset === -1) {
        // Track already ended server-side, advance
        setLoading(false);
        if (onEndedRef.current) onEndedRef.current();
        return;
      }
      if (offset > 0) audio.currentTime = offset;

      audio.play().catch(() => {
        setLoading(false);
        setPlaying(false);
      });
    }
  }, [playing, src, isStream, getSyncOffset]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlaying = () => {
      setPlaying(true);
      setLoading(false);
      setError(null);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onError = () => {
      setPlaying(false);
      setLoading(false);
      if (isStream) {
        setError('Stream error. Retrying…');
        retryTimer.current = setTimeout(() => {
          if (audio.src) {
            audio.load();
            setLoading(true);
            audio.play().catch(() => {
              setLoading(false);
            });
          }
        }, RETRY_DELAY);
      } else {
        setError('Playback error');
      }
    };
    const onEndedEvent = () => {
      if (!isStream) {
        setPlaying(false);
        if (onEndedRef.current) onEndedRef.current();
      }
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEndedEvent);

    return () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEndedEvent);
    };
  }, [isStream]);

  return (
    <div className="flex flex-col items-center gap-4">
      <audio ref={audioRef} preload="none" />

      <button
        onClick={togglePlay}
        disabled={!src}
        className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-accent/50 ${
          !src
            ? 'bg-gray-600 cursor-not-allowed'
            : playing
            ? 'bg-red-600 hover:bg-red-700 active:scale-95'
            : 'bg-accent hover:bg-green-600 active:scale-95'
        }`}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {loading ? (
          <svg className="animate-spin w-10 h-10" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : playing ? (
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-10 h-10 ml-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <p className="text-sm text-gray-400">
        {error
          ? <span className="text-red-400">{error}</span>
          : !src
          ? (isStream ? 'No stream available' : 'No track available')
          : loading
          ? (isStream ? 'Connecting to stream…' : 'Loading track…')
          : playing
          ? (isStream ? 'Now streaming' : 'Now playing')
          : 'Tap to Listen'}
      </p>
    </div>
  );
}
