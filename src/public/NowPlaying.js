import { useRef, useEffect, useState } from 'react';

function MarqueeText({ text }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const check = () => {
      if (containerRef.current && textRef.current) {
        setShouldScroll(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [text]);

  return (
    <div ref={containerRef} className="overflow-hidden whitespace-nowrap">
      <span
        ref={textRef}
        className={`inline-block text-lg font-bold text-heading ${shouldScroll ? 'marquee-scroll' : ''}`}
      >
        {text}
        {shouldScroll && <span className="mx-8">•</span>}
        {shouldScroll && text}
      </span>
    </div>
  );
}

export default function NowPlaying({ mode, currentTrack }) {
  const isMusic = mode === 'music';
  const trackKey = currentTrack?.id || 'empty';

  return (
    <div className="w-full max-w-md mx-auto bg-card backdrop-blur rounded-2xl p-6">
      {/* Mode badge */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            isMusic
              ? 'bg-accent/20 text-accent'
              : 'bg-purple-500/20 text-purple-400'
          }`}
        >
          {isMusic ? '♫ Music' : '🎙 Speaker Live'}
        </span>
      </div>

      {/* Current info — fade transition on song change */}
      {isMusic ? (
        currentTrack ? (
          <div key={trackKey} className="text-center animate-fade-in">
            <MarqueeText text={currentTrack.title} />
            <p className="text-sm text-txt-secondary mt-1">Now Playing</p>
          </div>
        ) : (
          <p className="text-center text-muted text-sm">
            Nothing playing right now
          </p>
        )
      ) : (
        <div className="text-center">
          <p className="text-lg font-bold text-heading">Speaker is Live</p>
          <p className="text-sm text-txt-secondary mt-1">Music paused</p>
        </div>
      )}
    </div>
  );
}
