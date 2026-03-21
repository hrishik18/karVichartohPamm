export default function NowPlayingAdmin({ mode, currentSpeaker, currentTrack }) {
  const isMusic = mode === 'music';

  return (
    <div className="bg-white/5 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Now Playing
      </h2>
      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
            isMusic
              ? 'bg-accent/20 text-accent'
              : 'bg-purple-500/20 text-purple-400'
          }`}
        >
          {isMusic ? 'Music' : 'Speaker'}
        </span>
        <span className="text-white font-medium truncate">
          {isMusic
            ? currentTrack?.title || '—'
            : currentSpeaker || '—'}
        </span>
      </div>
    </div>
  );
}
