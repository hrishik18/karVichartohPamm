export default function NowPlaying({ mode, currentTrack }) {
  const isMusic = mode === 'music';

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

      {/* Current info */}
      {isMusic ? (
        currentTrack ? (
          <div className="text-center">
            <p className="text-lg font-bold text-heading truncate">
              {currentTrack.title}
            </p>
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
