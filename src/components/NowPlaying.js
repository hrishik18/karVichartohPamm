export default function NowPlaying({ mode, currentSpeaker, currentTrack }) {
  const isMusic = mode === 'music';
  const hasCurrent = isMusic ? currentTrack : currentSpeaker;

  return (
    <div className="w-full max-w-md mx-auto bg-white/5 backdrop-blur rounded-2xl p-6">
      {/* Mode badge */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            isMusic
              ? 'bg-accent/20 text-accent'
              : 'bg-purple-500/20 text-purple-400'
          }`}
        >
          {isMusic ? '♫ Music' : '🎙 Speaker'}
        </span>
      </div>

      {/* Current info */}
      {hasCurrent ? (
        <div className="text-center">
          {isMusic ? (
            <>
              <p className="text-lg font-bold text-white truncate">
                {currentTrack.title}
              </p>
              <p className="text-sm text-gray-400 mt-1">Now Playing</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-white truncate">
                {currentSpeaker}
              </p>
              <p className="text-sm text-gray-400 mt-1">Speaking Live</p>
            </>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500 text-sm">
          Nothing playing right now
        </p>
      )}
    </div>
  );
}
